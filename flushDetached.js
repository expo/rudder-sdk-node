"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const fs_1 = __importDefault(require("fs"));
const _1 = __importDefault(require("."));
(async function flushDetached() {
    // The locally stored events file is always the last argument
    const eventsFile = process.argv.pop();
    (0, assert_1.default)(eventsFile, 'No events file specified');
    let events = {
        config: {},
        queue: [],
    };
    try {
        events = JSON.parse(eventsFile);
    }
    finally {
        await fs_1.default.promises.unlink(eventsFile);
    }
    if (!events.queue.length) {
        return;
    }
    const { writeKey, dataPlaneURL, ...options } = events.config;
    const client = new _1.default(writeKey, dataPlaneURL, {
        ...options,
        flushDetached: false,
    });
    for (const message of events.queue) {
        client.enqueue(message.type, message);
    }
    await client.flush();
})();
//# sourceMappingURL=flushDetached.js.map