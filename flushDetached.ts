import assert from 'assert';
import fs from 'fs';

import RudderStackClient, { AnalyticsPayload } from '.';

(async function flushDetached() {
  // The locally stored events file is always the last argument
  const eventsFile = process.argv.pop();

  assert(eventsFile, 'No events file specified');

  let events: { config: Record<string, any>; queue: AnalyticsPayload[] } = {
    config: {},
    queue: [],
  };

  try {
    events = JSON.parse(eventsFile);
  } finally {
    await fs.promises.unlink(eventsFile);
  }

  if (!events.queue.length) {
    return;
  }

  const { writeKey, dataPlaneURL, ...options } = events.config;
  const client = new RudderStackClient(writeKey, dataPlaneURL, {
    ...options,
    flushDetached: false,
  });

  for (const message of events.queue) {
    (client as any).enqueue(message.type, message);
  }

  await client.flush();
})();
