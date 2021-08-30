const assert = require("assert");
const removeSlash = require("remove-trailing-slash");
const looselyValidate = require("@segment/loosely-validate-event");
const serialize = require("serialize-javascript");
const axios = require("axios");
const axiosRetry = require("axios-retry");
const ms = require("ms");
const uuid = require("uuid/v4");
const md5 = require("md5");
const isString = require("lodash.isstring");
const version = require("./package.json").version;
const winston = require("winston");
const logFormat = winston.format.printf(
  ({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`;
  }
);

const setImmediate = global.setImmediate || process.nextTick.bind(process);
const noop = () => {};

class Analytics {
  /**
   * Initialize a new `Analytics` with your Segment project's `writeKey` and an
   * optional dictionary of `options`.
   *
   * @param {String} writeKey
   * @param {String} dataPlaneURL
   * @param {Object=} options (optional)
   * @param {Number=20} options.flushAt (default: 20)
   * @param {Number=20000} options.flushInterval (default: 20000)
   * @param {Boolean=true} options.enable (default: true)
   * @param {Number=20000} options.maxInternalQueueSize
   */

  constructor(writeKey, dataPlaneURL, options) {
    options = options || {};

    assert(writeKey, "You must pass your project's write key.");
    assert(dataPlaneURL, "You must pass your data plane url.");

    this.queue = [];
    this.state = "idle";
    this.writeKey = writeKey;
    this.host = removeSlash(dataPlaneURL);
    this.timeout = options.timeout || false;
    this.flushAt = Math.max(options.flushAt, 1) || 20;
    this.flushInterval = options.flushInterval || 20000;
    this.maxInternalQueueSize = options.maxInternalQueueSize || 20000;
    this.logLevel = options.logLevel || "info";
    this.flushed = false;
    Object.defineProperty(this, "enable", {
      configurable: false,
      writable: false,
      enumerable: true,
      value: typeof options.enable === "boolean" ? options.enable : true,
    });

    this.logger = winston.createLogger({
      level: this.logLevel,
      format: winston.format.combine(
        winston.format.label({ label: "Rudder" }),
        winston.format.timestamp(),
        logFormat
      ),
      transports: [new winston.transports.Console()],
    });

    axiosRetry(axios, { retries: 0 });
  }

  _validate(message, type) {
    try {
      looselyValidate(message, type);
    } catch (e) {
      if (e.message === "Your message must be < 32kb.") {
        this.logger.info(
          "Your message must be < 32kb. This is currently surfaced as a warning. Please update your code",
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
    this._validate(message, "identify");
    this.enqueue("identify", message, callback);
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
    this._validate(message, "group");
    this.enqueue("group", message, callback);
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
    this._validate(message, "track");
    this.enqueue("track", message, callback);
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
    this._validate(message, "page");
    this.enqueue("page", message, callback);
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
    this._validate(message, "screen");
    this.enqueue("screen", message, callback);
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
    this._validate(message, "alias");
    this.enqueue("alias", message, callback);
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

  enqueue(type, message, callback) {
    if (this.queue.length >= this.maxInternalQueueSize) {
      this.logger.error(
        "not adding events for processing as queue size " +
          this.queue.length +
          " >= than max configuration " +
          this.maxInternalQueueSize
      );
      return;
    }
    callback = callback || noop;

    if (!this.enable) {
      return setImmediate(callback);
    }

    if (type == "identify") {
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
        name: "analytics-node",
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
      this.logger.debug("flushAt reached, trying flush...");
      this.flush();
    }

    if (this.flushInterval && !this.flushTimer) {
      this.logger.debug("no existing flush timer, creating new one");
      this.flushTimer = setTimeout(this.flush.bind(this), this.flushInterval);
    }
  }

  /**
   * Flush the current queue
   *
   * @param {Function} [callback] (optional)
   * @return {Analytics}
   */

  flush(callback) {
    // check if earlier flush was pushed to queue
    this.logger.debug("in flush");
    if (this.state == "running") {
      this.logger.debug("skipping flush, earlier flush in progress");
      return;
    }
    this.state = "running";
    callback = callback || noop;

    if (!this.enable) {
      this.state = "idle";
      return setImmediate(callback);
    }

    if (this.timer) {
      this.logger.debug("cancelling existing timer...");
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.flushTimer) {
      this.logger.debug("cancelling existing flushTimer...");
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (!this.queue.length) {
      this.logger.debug("queue is empty, nothing to flush");
      this.state = "idle";
      return setImmediate(callback);
    }

    const items = this.queue.slice(0, this.flushAt);
    const callbacks = items.map((item) => item.callback);
    const messages = items.map((item) => {
      // if someone mangles directly with queue
      if (typeof item.message == "object") {
        item.message.sentAt = new Date();
      }
      return item.message;
    });

    const data = {
      batch: messages,
      sentAt: new Date(),
    };
    this.logger.debug("batch size is " + items.length);
    this.logger.silly("===data===", data);

    const done = (err) => {
      callbacks.forEach((callback_) => {
        callback_(err);
      });
      callback(err, data);
    };

    // Don't set the user agent if we're not on a browser. The latest spec allows
    // the User-Agent header (see https://fetch.spec.whatwg.org/#terminology-headers
    // and https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/setRequestHeader),
    // but browsers such as Chrome and Safari have not caught up.
    const headers = {};
    if (typeof window === "undefined") {
      headers["user-agent"] = `analytics-node/${version}`;
    }

    const req = {
      method: "POST",
      url: `${this.host}`,
      auth: {
        username: this.writeKey,
      },
      data,
      headers,
    };

    if (this.timeout) {
      req.timeout =
        typeof this.timeout === "string" ? ms(this.timeout) : this.timeout;
    }

    axios({
      ...req,
      "axios-retry": {
        retries: 3,
        retryCondition: this._isErrorRetryable.bind(this),
        retryDelay: axiosRetry.exponentialDelay
      }
    })
      .then((response) => {
        this.queue.splice(0, items.length);
        this.timer = setTimeout(this.flush.bind(this), this.flushInterval);
        this.state = "idle";
        done();
      })
      .catch((err) => {
        this.logger.error(
          "got error while attempting send for 3 times, dropping " +
            items.length +
            " events"
        );
        this.queue.splice(0, items.length);
        this.timer = setTimeout(this.flush.bind(this), this.flushInterval);
        this.state = "idle";
        if (err.response) {
          const error = new Error(err.response.statusText);
          return done(error);
        }
        done(err);
      });
  }

  _isErrorRetryable(error) {
    // Retry Network Errors.
    if (axiosRetry.isNetworkError(error)) {
      return true;
    }

    if (!error.response) {
      // Cannot determine if the request can be retried
      return false;
    }

    this.logger.error("error status: " + error.response.status);
    // Retry Server Errors (5xx).
    if (error.response.status >= 500 && error.response.status <= 599) {
      return true;
    }

    // Retry if rate limited.
    if (error.response.status === 429) {
      return true;
    }

    return false;
  }
}

module.exports = Analytics;
