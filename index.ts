import bunyan from '@expo/bunyan';
import looselyValidate from '@segment/loosely-validate-event';
import assert from 'assert';
import fetchRetry from 'fetch-retry';
import isString from 'lodash.isstring';
import md5 from 'md5';
import ms from 'ms';
import fetch from 'node-fetch';
import removeTrailingSlash from 'remove-trailing-slash';
import { v4 as uuid } from 'uuid';

const version = require('./package.json').version;

const retryableFetch = fetchRetry(fetch as any) as unknown as typeof fetch;
const setImmediate = global.setImmediate || process.nextTick.bind(process);
const noop = () => {};

enum AnalyticsState {
  Idle = 'idle',
  Running = 'running',
}

type AnalyticsMessage = any;

class Analytics {
  private readonly enable: boolean;
  private state = AnalyticsState.Idle;
  private queue = [] as {
    message: AnalyticsMessage;
    callback: (error?: Error, data?: { batch: AnalyticsMessage[]; sentAt: Date }) => void;
  }[];
  private writeKey: string;
  private host: string;
  private timeout: number | null;
  private flushAt: number;
  private flushInterval: number;
  private maxInternalQueueSize: number;
  private flushed: boolean = false;
  private flushTimer: NodeJS.Timer | null = null;
  private timer: NodeJS.Timer | null = null;

  private logger: bunyan;

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
      timeout?: number;
      flushAt?: number;
      flushInterval?: number;
      maxInternalQueueSize?: number;
      logLevel?: bunyan.LogLevel;
    } = {}
  ) {
    assert(writeKey, `You must pass your project's write key.`);
    assert(dataPlaneURL, `You must pass your data plane URL.`);

    this.writeKey = writeKey;
    this.host = removeTrailingSlash(dataPlaneURL);
    this.enable = enable;
    this.timeout = timeout;
    this.flushAt = Math.max(flushAt, 1);
    this.flushInterval = flushInterval;
    this.maxInternalQueueSize = maxInternalQueueSize;

    this.logger = bunyan.createLogger({
      name: '@expo/rudder-node-sdk',
      level: logLevel,
    });
  }

  _validate(message, type) {
    try {
      looselyValidate(message, type);
    } catch (e) {
      if (e.message === 'Your message must be < 32kb.') {
        this.logger.info(
          'Your message must be < 32kb. This is currently surfaced as a warning. Please update your code',
          message
        );
        return;
      }
      throw e;
    }
  }

  /**
   * Send an identify `message`.
   *
   * @param {Object} message
   * @param {String=} message.userId (optional)
   * @param {String=} message.anonymousId (optional)
   * @param {Object=} message.context (optional)
   * @param {Object=} message.traits (optional)
   * @param {Object=} message.integrations (optional)
   * @param {Date=} message.timestamp (optional)
   * @param {Function=} callback (optional)
   * @return {Analytics}
   */

  identify(message, callback) {
    this._validate(message, 'identify');
    this.enqueue('identify', message, callback);
    return this;
  }

  /**
   * Send a group `message`.
   *
   * @param {Object} message
   * @param {String} message.groupId
   * @param {String=} message.userId (optional)
   * @param {String=} message.anonymousId (optional)
   * @param {Object=} message.context (optional)
   * @param {Object=} message.traits (optional)
   * @param {Object=} message.integrations (optional)
   * @param {Date=} message.timestamp (optional)
   * @param {Function=} callback (optional)
   * @return {Analytics}
   */

  group(message, callback) {
    this._validate(message, 'group');
    this.enqueue('group', message, callback);
    return this;
  }

  /**
   * Send a track `message`.
   *
   * @param {Object} message
   * @param {String} message.event
   * @param {String=} message.userId (optional)
   * @param {String=} message.anonymousId (optional)
   * @param {Object=} message.context (optional)
   * @param {Object=} message.properties (optional)
   * @param {Object=} message.integrations (optional)
   * @param {Date=} message.timestamp (optional)
   * @param {Function=} callback (optional)
   * @return {Analytics}
   */

  track(message, callback) {
    this._validate(message, 'track');
    this.enqueue('track', message, callback);
    return this;
  }

  /**
   * Send a page `message`.
   *
   * @param {Object} message
   * @param {String} message.name
   * @param {String=} message.userId (optional)
   * @param {String=} message.anonymousId (optional)
   * @param {Object=} message.context (optional)
   * @param {Object=} message.properties (optional)
   * @param {Object=} message.integrations (optional)
   * @param {Date=} message.timestamp (optional)
   * @param {Function=} callback (optional)
   * @return {Analytics}
   */

  page(message, callback) {
    this._validate(message, 'page');
    this.enqueue('page', message, callback);
    return this;
  }

  /**
   * Send a screen `message`.
   *
   * @param {Object} message
   * @param {Function} fn (optional)
   * @return {Analytics}
   */

  screen(message, callback) {
    this._validate(message, 'screen');
    this.enqueue('screen', message, callback);
    return this;
  }

  /**
   * Send an alias `message`.
   *
   * @param {Object} message
   * @param {String} message.previousId
   * @param {String=} message.userId (optional)
   * @param {String=} message.anonymousId (optional)
   * @param {Object=} message.context (optional)
   * @param {Object=} message.properties (optional)
   * @param {Object=} message.integrations (optional)
   * @param {Date=} message.timestamp (optional)
   * @param {Function=} callback (optional)
   * @return {Analytics}
   */

  alias(message, callback) {
    this._validate(message, 'alias');
    this.enqueue('alias', message, callback);
    return this;
  }

  /**
   * Add a `message` of type `type` to the queue and
   * check whether it should be flushed.
   *
   * @param {String} type
   * @param {Object} message
   * @param {Function} [callback] (optional)
   * @api private
   */

  enqueue(type, message, callback): void {
    if (this.queue.length >= this.maxInternalQueueSize) {
      this.logger.error(
        'not adding events for processing as queue size ' +
          this.queue.length +
          ' >= than max configuration ' +
          this.maxInternalQueueSize
      );
      return;
    }
    callback = callback || noop;

    if (!this.enable) {
      setImmediate(callback);
      return;
    }

    if (type == 'identify') {
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
        name: '@expo/rudder-node-sdk',
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

    // Historically this library has accepted strings and numbers as IDs.
    // However, our spec only allows strings. To avoid breaking compatibility,
    // we'll coerce these to strings if they aren't already.
    if (message.anonymousId && !isString(message.anonymousId)) {
      message.anonymousId = JSON.stringify(message.anonymousId);
    }
    if (message.userId && !isString(message.userId)) {
      message.userId = JSON.stringify(message.userId);
    }

    this.queue.push({ message, callback });

    if (!this.flushed) {
      this.flushed = true;
      this.flush();
      return;
    }

    if (this.queue.length >= this.flushAt) {
      this.logger.debug('flushAt reached, trying flush...');
      this.flush();
    }

    if (this.flushInterval && !this.flushTimer) {
      this.logger.debug('no existing flush timer, creating new one');
      this.flushTimer = setTimeout(this.flush.bind(this), this.flushInterval);
    }
  }

  /**
   * Flush the current queue
   *
   * @param {Function} [callback] (optional)
   * @return {Analytics}
   */

  flush(callback?) {
    // check if earlier flush was pushed to queue
    this.logger.debug('in flush');
    if (this.state == AnalyticsState.Running) {
      this.logger.debug('skipping flush, earlier flush in progress');
      return;
    }
    this.state = AnalyticsState.Running;
    callback = callback || noop;

    if (!this.enable) {
      this.state = AnalyticsState.Idle;
      setImmediate(callback);
      return;
    }

    if (this.timer) {
      this.logger.debug('cancelling existing timer...');
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.flushTimer) {
      this.logger.debug('cancelling existing flushTimer...');
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (!this.queue.length) {
      this.logger.debug('queue is empty, nothing to flush');
      this.state = AnalyticsState.Idle;
      setImmediate(callback);
      return;
    }

    const items = this.queue.slice(0, this.flushAt);
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

    const done = (err?) => {
      callbacks.forEach((callback_) => {
        callback_(err);
      });
      callback(err, data);
    };

    const req = {
      method: 'POST',
      headers: {
        // Don't set the user agent if we're not on a browser. The latest spec allows
        // the User-Agent header (see https://fetch.spec.whatwg.org/#terminology-headers
        // and https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/setRequestHeader),
        // but browsers such as Chrome and Safari have not caught up.
        ...(typeof window === 'undefined' ? { 'User-Agent': `analytics-node/${version}` } : null),
        Authorization: 'Basic ' + Buffer.from(`${this.writeKey}:`).toString('base64'),
      },
      body: JSON.stringify(data),
      retryDelay: this._exponentialDelay.bind(this),
      retryOn: this._isErrorRetryable.bind(this),
    };

    if (this.timeout) {
      // @ts-expect-error Need to define timeout on the request object
      req.timeout = typeof this.timeout === 'string' ? ms(this.timeout) : this.timeout;
    }

    retryableFetch(`${this.host}`, req)
      .then((_response) => {
        this.queue.splice(0, items.length);
        this.timer = setTimeout(this.flush.bind(this), this.flushInterval);
        this.state = AnalyticsState.Idle;
        done();
      })
      .catch((err) => {
        this.logger.error(
          'request failed to send after 3 retries, dropping ' + items.length + ' events'
        );
        this.queue.splice(0, items.length);
        this.timer = setTimeout(this.flush.bind(this), this.flushInterval);
        this.state = AnalyticsState.Idle;
        if (err.response) {
          const error = new Error(err.response.statusText);
          return done(error);
        }
        done(err);
      });
  }

  _exponentialDelay(attempt, _error, _response) {
    const delay = Math.pow(2, attempt + 1) * 200;
    const randomSum = delay * 0.2 * Math.random(); // 0-20% of the delay
    return delay + randomSum;
  }

  _isErrorRetryable(attempt, error, response) {
    // 3 retries max
    if (attempt > 2) {
      return false;
    }

    // retry on any network error
    if (error !== null) {
      return true;
    }
    // retry on 5xx status codes
    else if (response.status >= 500 && response.status <= 599) {
      return true;
    }
    // Retry if rate limited
    else if (response.status === 429) {
      return true;
      // All other cases, do not retry
    } else {
      return false;
    }
  }
}

export = Analytics;
