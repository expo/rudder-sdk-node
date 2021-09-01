Unpublished
==========================

### Breaking changes

* The main Analytics class is now a default export instead of being the value of `module.exports`. If you're using `require` with this library, you'll need to write `require('@expo/rudder-sdk-node').default`. If you're using `import` with this library, no changes are needed.
* Removed support for persisting events in Redis
* Changed the logger from `winston` to `bunyan` (specifically, `@expo/bunyan`)
* Changed the default log level from INFO to FATAL

### Minor changes

* Convert from JavaScript to TypeScript. First-class type 
* Replaced `axios` with `node-fetch`
* The library name in the log context object is now `@expo/rudder-sdk-node`
* The user agent string is now `expo-rudder-sdk-node/<version>`

v1.0.8
==========================

Based on 1.0.3+ of [`@rudderstack/rudder-sdk-node`](https://github.com/rudderlabs/rudder-sdk-node/commit/8060ec7303df24491664686f6cf2620a2436797f).

* Consistently use winston instead of console.log for logging
