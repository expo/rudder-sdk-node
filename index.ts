import bunyan from '@expo/bunyan';
import looselyValidate from '@segment/loosely-validate-event';
import assert from 'assert';
import fetchRetry from 'fetch-retry';
import md5 from 'md5';
import fetch, { Response } from 'node-fetch';
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

export type AnalyticsFlushCallback = (
  error?: Error,
  data?: { batch: AnalyticsPayload[]; sentAt: Date }
) => void;

type FlushResponse = {
  error?: Error;
  data: { batch: AnalyticsPayload[]; sentAt: Date };
};

type AnalyticsPayload = any;

type AnalyticsEventType = 'identify' | 'track' | 'page' | 'screen' | 'group' | 'alias';

export default class Analytics {
  private readonly enable: boolean;

  private readonly queue = [] as {
    message: AnalyticsPayload;
    callback: AnalyticsMessageCallback;
  }[];

  private readonly writeKey: string;
  private readonly host: string;
  private readonly timeout: number;

  private readonly flushAt: number;
  private readonly flushInterval: number;
  private readonly maxInternalQueueSize: number;
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
      maxInternalQueueSize = 20000,
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
      maxInternalQueueSize?: number;
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
    this.maxInternalQueueSize = maxInternalQueueSize;

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
        this.logger.info(
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
    if (this.queue.length >= this.maxInternalQueueSize) {
      this.logger.error(
        `Not adding events for processing as queue size ${this.queue.length} exceeds max configuration ${this.maxInternalQueueSize}`
      );
      return;
    }

    if (!this.enable) {
      setImmediate(callback);
      return;
    }

    if (type === 'identify') {
      if (message.traits) {
        if (!message.context) {
          message.context = {};
        }
        message.context.traits = message.traits;
      }
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

    this.queue.push({ message, callback });

    if (!this.flushed) {
      this.flushed = true;
      this.flush();
      return;
    }

    const hasReachedFlushAt = this.queue.length >= this.flushAt;
    const hasReachedQueueSize =
      this.queue.reduce((sum, item) => sum + JSON.stringify(item).length, 0) >=
      this.maxInternalQueueSize;
    if (hasReachedFlushAt || hasReachedQueueSize) {
      this.logger.debug('flushAt reached, trying flush...');
      this.flush();
    }

    if (this.flushInterval && !this.timer) {
      this.logger.debug('no existing flush timer, creating new one');
      this.timer = setTimeout(this.flush.bind(this), this.flushInterval);
    }
  }

  /**
   * Flushes the message queue to the server immediately if a flush is not already in progress.
   */
  async flush(callback: AnalyticsFlushCallback = () => {}): Promise<FlushResponse> {
    // check if earlier flush was pushed to queue
    this.logger.debug('in flush');

    if (!this.enable) {
      setImmediate(callback);
      return this.nullFlushResponse();
    }

    if (this.timer) {
      this.logger.debug('cancelling existing timer...');
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (!this.queue.length) {
      this.logger.debug('queue is empty, nothing to flush');
      setImmediate(callback);
      return this.nullFlushResponse();
    }

    const items = this.queue.splice(0, this.flushAt);
    const callbacks = items.map((item) => item.callback);
    const messages = items.map((item) => {
      // if someone mangles directly with queue
      if (typeof item.message == 'object') {
        item.message.sentAt = new Date();
      }
      return item.message;
    });

    const data = {
      batch: messages,
      sentAt: new Date(),
    };
    this.logger.debug('batch size is ' + items.length);
    this.logger.trace('===data===', data);

    const done = (err?: Error) => {
      callbacks.forEach((callback_) => {
        callback_(err);
      });
      callback(err, data);
    };

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

    try {
      const response = await retryableFetch(`${this.host}`, req);
      // handle success
      if (response.ok) {
        done();
        return { data };
      }
      // handle 4xx 5xx errors
      this.logger.error(
        'request failed to send after 3 retries, dropping ' + items.length + ' events'
      );
      const error = new Error(response.statusText);
      done(error);
      return { error, data };
    } catch (error) {
      // handle network errors
      this.logger.error(
        'request failed to send after 3 retries, dropping ' + items.length + ' events'
      );
      done(error);
      return { error, data };
    }
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

  private nullFlushResponse(): FlushResponse {
    return {
      data: {
        batch: [],
        sentAt: new Date(),
      },
    };
  }
}
