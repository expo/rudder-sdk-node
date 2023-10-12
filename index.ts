import bunyan from '@expo/bunyan';
import looselyValidate from '@segment/loosely-validate-event';
import assert from 'assert';
import cp from 'child_process';
import fetchRetry from 'fetch-retry';
import fs from 'fs';
import md5 from 'md5';
import fetch, { Response } from 'node-fetch';
import os from 'os';
import path from 'path';
import removeTrailingSlash from 'remove-trailing-slash';
import { v4 as uuid } from 'uuid';

const version = require('./package.json').version;

const retryableFetch = fetchRetry(fetch as any) as unknown as typeof fetch;
const setImmediate = global.setImmediate || process.nextTick.bind(process);

export type AnalyticsMessage = AnalyticsIdentity & {
  context?: { [key: string]: unknown };
  integrations?: { [destination: string]: boolean };
  properties?: { [key: string]: unknown };
  timestamp?: Date;
  [key: string]: unknown;
};

export type AnalyticsIdentity = { userId: string } | { userId?: string; anonymousId: string };

export type AnalyticsMessageCallback = (error?: Error) => void;

export type AnalyticsFlushCallback = (flushResponses: FlushResponse[]) => void;

type FlushResponse = {
  error?: Error;
  data: { batch: AnalyticsPayload[]; sentAt: Date };
};

export type AnalyticsPayload = {
  messageId: string;
  _metadata: any;
  context: any;
  type: string;
  originalTimestamp: Date;
  [key: string]: any;
};

type AnalyticsEventType = 'identify' | 'track' | 'page' | 'screen' | 'group' | 'alias';

type MessageAndCallback = {
  message: AnalyticsPayload;
  callback: AnalyticsMessageCallback;
};

export default class Analytics {
  private readonly enable: boolean;

  private inFlightFlush: Promise<FlushResponse[]> | null = null;
  private readonly queue = [] as {
    message: AnalyticsPayload;
    callback: AnalyticsMessageCallback;
  }[];

  private readonly writeKey: string;
  private readonly host: string;
  private readonly timeout: number;

  private readonly flushAt: number;
  private readonly flushInterval: number;
  private readonly flushDetached: boolean;
  private readonly maxFlushSizeInBytes: number;
  private readonly maxQueueLength: number;
  private readonly flushCallbacks: AnalyticsFlushCallback[] = [];
  private readonly flushResponses: FlushResponse[] = [];
  private finalMessageId: string | null = null;
  private flushed: boolean = false;
  private timer: NodeJS.Timer | null = null;

  private readonly logger: bunyan;

  /**
   * Initialize a new `Analytics` instance with your RudderStack project's `writeKey` and an
   * optional dictionary of options.
   */
  constructor(
    writeKey: string,
    dataPlaneURL: string,
    {
      enable = true,
      timeout = 0,
      flushAt = 20,
      flushInterval = 20000,
      flushDetached = false,
      maxFlushSizeInBytes = 1024 * 1000 * 3.9, // defaults to ~3.9mb
      maxQueueLength = 1000,
      logLevel = bunyan.FATAL,
    }: {
      enable?: boolean;
      /**
       * The network timeout (in milliseconds) for how long to wait for a request to complete when
       * sending messages to the data plane. Omit or specify 0 or a negative value to disable
       * timeouts.
       */
      timeout?: number;
      flushAt?: number;
      flushInterval?: number;
      flushDetached?: boolean;
      maxFlushSizeInBytes?: number;
      maxQueueLength?: number;
      logLevel?: bunyan.LogLevel;
    } = {}
  ) {
    this.enable = enable;

    assert(writeKey, `The project's write key must be specified`);
    assert(dataPlaneURL, `The data plane URL must be specified`);

    this.writeKey = writeKey;
    this.host = removeTrailingSlash(dataPlaneURL);
    this.timeout = timeout;

    this.flushAt = Math.max(flushAt, 1);
    this.flushInterval = flushInterval;
    this.flushDetached = flushDetached;
    this.maxFlushSizeInBytes = maxFlushSizeInBytes;
    this.maxQueueLength = maxQueueLength;

    this.logger = bunyan.createLogger({
      name: '@expo/rudder-node-sdk',
      level: logLevel,
    });
  }

  /**
   * Sends an "identify" message that associates traits with a user.
   */
  identify(
    message: AnalyticsMessage & { traits?: { [key: string]: unknown } },
    callback?: AnalyticsMessageCallback
  ): Analytics {
    this.validate(message, 'identify');
    this.enqueue('identify', message, callback);
    return this;
  }
  traits?: { [key: string]: unknown };

  /**
   * Sends a "group" message that identifies this user with a group.
   */
  group(
    message: AnalyticsMessage & { groupId: string; traits?: { [key: string]: unknown } },
    callback?: AnalyticsMessageCallback
  ): Analytics {
    this.validate(message, 'group');
    this.enqueue('group', message, callback);
    return this;
  }

  /**
   * Sends a "track" event that records an action.
   */
  track(
    message: AnalyticsMessage & { event: string },
    callback?: AnalyticsMessageCallback
  ): Analytics {
    this.validate(message, 'track');
    this.enqueue('track', message, callback);
    return this;
  }

  /**
   * Sends a "page" event that records a page view on a website.
   */
  page(
    message: AnalyticsMessage & { name: string },
    callback?: AnalyticsMessageCallback
  ): Analytics {
    this.validate(message, 'page');
    this.enqueue('page', message, callback);
    return this;
  }

  /**
   * Sends a "screen" event that records a screen view in an app.
   */

  screen(message: AnalyticsMessage, callback?: AnalyticsMessageCallback): Analytics {
    this.validate(message, 'screen');
    this.enqueue('screen', message, callback);
    return this;
  }

  /**
   * Sends an "alias" message that associates one ID with another.
   */
  alias(
    message: { previousId: string; traits?: { [key: string]: unknown } } & AnalyticsIdentity,
    callback?: AnalyticsMessageCallback
  ): Analytics {
    this.validate(message, 'alias');
    this.enqueue('alias', message, callback);
    return this;
  }

  private validate(message: Partial<AnalyticsMessage>, type: AnalyticsEventType): void {
    try {
      looselyValidate(message, type);
    } catch (e) {
      if (e.message === 'Your message must be < 32kb.') {
        this.logger.warn(
          'Your message must be < 32KiB. This is currently surfaced as a warning. Please update your code.',
          message
        );
        return;
      }
      throw e;
    }
  }

  /**
   * Adds a message of the specified type to the queue and flushes the queue if appropriate.
   */
  private enqueue(
    type: AnalyticsEventType,
    message: any,
    callback: AnalyticsMessageCallback = () => {}
  ): void {
    if (!this.enable) {
      setImmediate(callback);
      return;
    }

    if (!this.flushDetached && this.queue.length >= this.maxQueueLength) {
      this.logger.error(
        `Not adding events for processing as queue size ${this.queue.length} exceeds max configuration ${this.maxQueueLength}`
      );
      setImmediate(callback);
      return;
    }

    if (type === 'identify') {
      message.traits ??= {};
      message.context ??= {};
      message.context.traits = message.traits;
    }

    message = { ...message };
    message.type = type;

    message.context = {
      library: {
        name: '@expo/rudder-sdk-node',
        version,
      },
      ...message.context,
    };

    message._metadata = {
      nodeVersion: process.versions.node,
      ...message._metadata,
    };

    if (!message.originalTimestamp) {
      message.originalTimestamp = new Date();
    }

    if (!message.messageId) {
      // We md5 the messaage to add more randomness. This is primarily meant
      // for use in the browser where the uuid package falls back to Math.random()
      // which is not a great source of randomness.
      // Borrowed from analytics.js (https://github.com/segment-integrations/analytics.js-integration-segmentio/blob/a20d2a2d222aeb3ab2a8c7e72280f1df2618440e/lib/index.js#L255-L256).
      message.messageId = `node-${md5(JSON.stringify(message))}-${uuid()}`;
    }

    if (this.flushDetached) {
      // Do not add the callback when in detached mode
      this.queue.push({ message, callback: () => {} });
      this.logger.debug('Event is queued and will be flushed in a detached process');
      return;
    } else {
      this.queue.push({ message, callback });
    }

    if (!this.flushed) {
      this.flushed = true;
      this.flush();
      return;
    }

    const isDivisibleByFlushAt = this.queue.length % this.flushAt === 0;
    if (isDivisibleByFlushAt) {
      this.logger.debug(
        `flushAt reached, messageQueueLength is ${this.queue.length}, trying flush...`
      );
      this.flush();
    } else if (this.flushInterval && !this.timer) {
      // only start a timer if there are dangling items in the message queue
      this.logger.debug('no existing flush timer, creating new one');
      this.timer = setTimeout(this.flush.bind(this), this.flushInterval);
    }
  }

  /**
   * Flushes the message queue to the server immediately if a flush is not already in progress.
   */
  async flush(callback: AnalyticsFlushCallback = () => {}): Promise<FlushResponse[]> {
    this.logger.debug('in flush');

    if (this.flushDetached) {
      this.executeDetachedFlush();
      return [];
    }

    // will cause new messages to be rolled up into the in-flight flush
    this.finalMessageId = this.queue.length
      ? this.queue[this.queue.length - 1].message.messageId
      : null;
    this.logger.trace('finalMessageId: ' + this.finalMessageId);
    this.flushCallbacks.push(callback);

    if (this.inFlightFlush) {
      this.logger.debug('skipping flush, there is an in flight flush');
      return await this.inFlightFlush;
    }

    this.inFlightFlush = this.executeFlush();
    const flushResponse = await this.inFlightFlush;
    this.logger.debug('resetting client flush state');
    this.inFlightFlush = null;
    this.finalMessageId = null;
    this.logger.trace('===flushResponse===', flushResponse);
    return flushResponse;
  }

  /**
   * Flushes messages from the message queue inside a separate and detached process.
   * This is useful for CLIs to not block the main process, but still flush all messages as expected.
   * It works by writing all queued events to a serialized file, and starting a new process that loads and executes them.
   * Note, message callbacks are never resolved when running in detached mode.
   */
  private executeDetachedFlush(): void {
    this.logger.debug('in execute detached flush');

    if (!this.enable) {
      this.logger.debug('client not enabled, skipping flush');
      this.flushResponses.splice(0, this.flushResponses.length);
      return;
    }

    if (!this.queue.length) {
      return this.logger.debug('no events queued, skipping flush');
    }

    // Create a temporary file to store the events
    const eventsFile = path.join(os.tmpdir(), `rudder-node-sdk-events-${Date.now()}.json`);
    // Serialize options and message data without callbacks
    const events = JSON.stringify({
      queue: this.queue.map((item) => ({ message: item.message })),
      config: {
        writeKey: this.writeKey,
        dataPlaneURL: this.host,
        flushAt: this.flushAt,
        flushInterval: this.flushInterval,
        maxFlushSizeInBytes: this.maxFlushSizeInBytes,
        maxQueueLength: this.maxQueueLength,
      },
    });

    fs.mkdirSync(path.dirname(eventsFile), { recursive: true });
    fs.writeFileSync(eventsFile, events);

    // Start a new process to flush the events
    cp.spawn(process.execPath, [path.resolve(__dirname, 'flushDetached.js'), eventsFile], {
      detached: true,
      windowsHide: true,
      shell: false,
    });
  }

  /**
   * Flushes messages from the message queue to the server immediately. After the flush has finished,
   * this checks for pending flushes and executes them. All data is rolled up into a single FlushResponse.
   */
  private async executeFlush(flushedItems: MessageAndCallback[] = []): Promise<FlushResponse[]> {
    this.logger.debug('in execute flush');
    if (!this.enable) {
      this.logger.debug('client not enabled, skipping flush');
      this.flushResponses.splice(0, this.flushResponses.length);
      const nullResponse = this.nullFlushResponse();
      this.flushCallbacks
        .splice(0, this.flushCallbacks.length)
        .map((callback) => setImmediate(callback, nullResponse));
      return nullResponse;
    }

    if (this.timer) {
      this.logger.debug('cancelling existing timer...');
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (!this.queue.length) {
      this.logger.debug('queue is empty, nothing to flush');
      this.flushResponses.splice(0, this.flushResponses.length);
      const nullResponse = this.nullFlushResponse();
      this.flushCallbacks
        .splice(0, this.flushCallbacks.length)
        .map((callback) => setImmediate(callback, nullResponse));
      return nullResponse;
    }

    let flushSize = 0;
    let spliceIndex = 0;

    // guard against requests larger than 4mb
    for (let i = 0; i < this.queue.length; i++) {
      const item = this.queue[i];
      const itemSize = JSON.stringify(item).length;
      const exceededMaxFlushSize = flushSize + itemSize > this.maxFlushSizeInBytes;
      if (exceededMaxFlushSize) {
        break;
      }

      flushSize += itemSize;
      spliceIndex++;
      if ((item.message.messageId ?? null) === this.finalMessageId || !this.finalMessageId) {
        break; // guard against flushing items added to the message queue during this flush
      }
    }

    const itemsToFlush = this.queue.splice(0, spliceIndex);
    const callbacks = itemsToFlush.map((item) => item.callback);
    const currentBatchOfMessages = itemsToFlush.map((item) => {
      // if someone mangles directly with queue
      if (typeof item.message == 'object') {
        item.message.sentAt = new Date();
      }
      return item.message;
    });

    const done = (err?: Error) => {
      callbacks.forEach((callback_) => {
        callback_(err);
      });
      const flushResponses = this.flushResponses.slice(0, this.flushResponses.length);
      this.flushCallbacks
        .splice(0, this.flushCallbacks.length)
        .map((callback) => setImmediate(callback, flushResponses));
    };

    const data = {
      batch: currentBatchOfMessages,
      sentAt: new Date(),
    };
    this.logger.debug('batch size is ' + itemsToFlush.length);
    this.logger.trace('===data===', data);

    const req = {
      method: 'POST',
      headers: {
        accept: 'application/json, text/plain, */*',
        'content-type': 'application/json;charset=utf-8',
        'user-agent': `expo-rudder-sdk-node/${version}`,
        authorization: 'Basic ' + Buffer.from(`${this.writeKey}:`).toString('base64'),
      },
      body: JSON.stringify(data),
      timeout: this.timeout > 0 ? this.timeout : undefined,
      retryDelay: this.getExponentialDelay.bind(this),
      retryOn: this.isErrorRetryable.bind(this),
    };

    let error: Error | undefined = undefined;
    try {
      const response = await retryableFetch(`${this.host}`, req);
      if (!response.ok) {
        // handle 4xx 5xx errors
        this.logger.error(
          'request failed to send after 3 retries, dropping ' + itemsToFlush.length + ' events'
        );
        error = new Error(response.statusText);
      }
    } catch (err) {
      // handle network errors
      this.logger.error(
        'request failed to send after 3 retries, dropping ' + itemsToFlush.length + ' events'
      );
      error = err;
    }

    this.flushResponses.push({ error, data });
    const finishedFlushing =
      currentBatchOfMessages[currentBatchOfMessages.length - 1].messageId === this.finalMessageId ||
      !this.finalMessageId;
    if (finishedFlushing) {
      if (error) {
        done(error);
      } else {
        done();
      }
      return this.flushResponses.splice(0, this.flushResponses.length);
    }

    callbacks.forEach((callback_) => {
      callback_(error);
    });

    return await this.executeFlush(flushedItems.concat(itemsToFlush));
  }

  /**
   * Calculates the amount of time to wait before retrying a request, given the number of prior
   * retries (excluding the initial attempt).
   *
   * @param priorRetryCount the number of prior retries, starting from zero
   */
  private getExponentialDelay(priorRetryCount: number): number {
    const delay = 2 ** priorRetryCount * 200;
    const jitter = delay * 0.2 * Math.random(); // 0-20% of the delay
    return delay + jitter;
  }

  /**
   * Returns whether to retry a request that failed with the given error or returned the given
   * response.
   */
  private isErrorRetryable(
    priorRetryCount: number,
    error: Error | null,
    response: Response
  ): boolean {
    // 3 retries max
    if (priorRetryCount > 2) {
      return false;
    }

    return (
      // Retry on any network error
      !!error ||
      // Retry if rate limited
      response.status === 429 ||
      // Retry on 5xx status codes due to server errors
      (response.status >= 500 && response.status <= 599)
    );
  }

  private nullFlushResponse(): FlushResponse[] {
    return [
      {
        data: {
          batch: [],
          sentAt: new Date(),
        },
      },
    ];
  }
}
