import test from 'ava';
import auth from 'basic-auth';
import bodyParser from 'body-parser';
import delay from 'delay';
import express from 'express';
import pify from 'pify';
import { spy, stub } from 'sinon';

import Analytics from '.';
import { version } from './package.json';

const noop = () => {};

const context = {
  library: {
    name: '@expo/rudder-sdk-node',
    version,
  },
};

const metadata = { nodeVersion: process.versions.node };
const host = 'http://localhost';
const port = 4063;

const createClient = (options) => {
  options = { ...options };

  const client = new Analytics('key', `${host}:${port}`, options);
  client.flush = pify(client.flush.bind(client));
  client.flushed = true;

  return client;
};

test.before.cb((t) => {
  express()
    .use(bodyParser.json())
    .post('/', (req, res) => {
      const batch = req.body.batch;

      const { name: writeKey } = auth(req);
      if (!writeKey) {
        return res.status(400).json({
          error: { message: 'missing write key' },
        });
      }

      const ua = req.get('user-agent');
      if (ua !== `expo-rudder-sdk-node/${version}`) {
        return res.status(400).json({
          error: { message: 'invalid user-agent' },
        });
      }

      if (batch[0] === 'error') {
        return res.status(400).json({
          error: { message: 'error' },
        });
      }

      if (batch[0] === 'timeout') {
        return setTimeout(() => res.end(), 5000);
      }

      res.json(req.body);
    })
    .listen(port, t.end);
});

test('expose a constructor', (t) => {
  t.is(typeof Analytics, 'function');
});

test('require a write key', (t) => {
  t.throws(() => new Analytics(), "The project's write key must be specified");
});

test('create a queue', (t) => {
  const client = createClient();

  t.deepEqual(client.queue, []);
});

test('default options', (t) => {
  t.throws(() => new Analytics('key'), 'The data plane URL must be specified');
});

test('remove trailing slashes from `host`', (t) => {
  const client = new Analytics('key', 'http://google.com///');

  t.is(client.host, 'http://google.com');
  t.is(client.writeKey, 'key');
  t.is(client.flushAt, 20);
  t.is(client.flushInterval, 20000);
});

test('overwrite defaults with options', (t) => {
  const client = new Analytics('key', 'a', {
    flushAt: 1,
    flushInterval: 2,
  });

  t.is(client.host, 'a');
  t.is(client.flushAt, 1);
  t.is(client.flushInterval, 2);
});

test('keep the flushAt option above zero', (t) => {
  const client = createClient({ flushAt: 0 });

  t.is(client.flushAt, 1);
});

test('enqueue - add a message to the queue', (t) => {
  const client = createClient();

  const originalTimestamp = new Date();
  client.enqueue('type', { originalTimestamp }, noop);

  t.is(client.queue.length, 1);

  const item = client.queue.pop();

  t.is(typeof item.message.messageId, 'string');
  t.regex(item.message.messageId, /node-[a-zA-Z0-9]{32}/);
  t.deepEqual(item, {
    message: {
      originalTimestamp,
      type: 'type',
      context,
      _metadata: metadata,
      messageId: item.message.messageId,
    },
    callback: noop,
  });
});

test('enqueue - stringify userId', (t) => {
  const client = createClient();

  client.track(
    {
      userId: 10,
      event: 'event',
    },
    noop
  );

  t.is(client.queue.length, 1);

  const item = client.queue.pop();

  t.is(item.message.anonymousId, undefined);
  t.is(item.message.userId, '10');
});

test('enqueue - stringify anonymousId', (t) => {
  const client = createClient();

  client.screen(
    {
      anonymousId: 157963456373623802,
      name: 'screen name',
    },
    noop
  );

  t.is(client.queue.length, 1);

  const item = client.queue.pop();

  t.is(item.message.userId, undefined);
  // v8 will lose precision for big numbers.
  t.is(item.message.anonymousId, '157963456373623800');
});

test('enqueue - stringify ids handles strings', (t) => {
  const client = createClient();

  client.screen(
    {
      anonymousId: '15796345',
      // We're explicitly testing the behaviour of the library if a customer
      // uses a String constructor.
      userId: new String('prateek'), // eslint-disable-line no-new-wrappers
      name: 'screen name',
    },
    noop
  );

  t.is(client.queue.length, 1);

  const item = client.queue.pop();

  t.is(item.message.anonymousId, '15796345');
  t.is(item.message.userId.toString(), 'prateek');
});

test("enqueue - don't modify the original message", (t) => {
  const client = createClient();
  const message = { event: 'test' };

  client.enqueue('type', message);

  t.deepEqual(message, { event: 'test' });
});

test('enqueue - flush on first message', (t) => {
  const client = createClient({ flushAt: 2 });
  client.flushed = false;
  spy(client, 'flush');

  client.enqueue('type', {});
  t.true(client.flush.calledOnce);

  client.enqueue('type', {});
  t.true(client.flush.calledOnce);

  client.enqueue('type', {});
  t.true(client.flush.calledTwice);
});

test('enqueue - flush the queue if it hits the max length', (t) => {
  const client = createClient({
    flushAt: 1,
    flushInterval: null,
  });

  stub(client, 'flush');

  client.enqueue('type', {});

  t.true(client.flush.calledOnce);
});

test('enqueue - flush after a period of time', async (t) => {
  const client = createClient({ flushInterval: 10 });
  stub(client, 'flush');

  client.enqueue('type', {});

  t.false(client.flush.called);
  await delay(20);

  t.true(client.flush.calledOnce);
});

test("enqueue - don't reset an existing timer", async (t) => {
  const client = createClient({ flushInterval: 10 });
  stub(client, 'flush');

  client.enqueue('type', {});
  await delay(5);
  client.enqueue('type', {});
  await delay(5);

  t.true(client.flush.calledOnce);
});

test('enqueue - extend context', (t) => {
  const client = createClient();

  client.enqueue(
    'type',
    {
      event: 'test',
      context: { name: 'travis' },
    },
    noop
  );

  const actualContext = client.queue[0].message.context;
  const expectedContext = { ...context, name: 'travis' };

  t.deepEqual(actualContext, expectedContext);
});

test('enqueue - skip when client is disabled', async (t) => {
  const client = createClient({ enable: false });
  stub(client, 'flush');

  const callback = spy();
  client.enqueue('type', {}, callback);
  await delay(5);

  t.true(callback.calledOnce);
  t.false(client.flush.called);
});

test("flush - don't fail when queue is empty", async (t) => {
  const client = createClient();

  await t.notThrows(client.flush());
});

test('flush - send messages', async (t) => {
  const client = createClient({ flushAt: 2 });

  const callbackA = spy();
  const callbackB = spy();
  const callbackC = spy();

  client.identify({ userId: 'id', traits: { traitOne: 'a1' } }, callbackA);
  client.page({ userId: 'id', category: 'category', name: 'b1' }, callbackB);
  client.track({ userId: 'id', event: 'c1' }, callbackC);

  const data = await client.flush();
  await delay(5); // ensure the test context exists long enough for the second flush to occur
  t.deepEqual(Object.keys(data), ['batch', 'sentAt']);
  const keys = Object.keys(data.batch[0]);
  t.true(keys.includes('originalTimestamp'));
  t.true(keys.includes('sentAt'));
  t.true(data.sentAt instanceof Date);
  t.true(callbackA.calledOnce);
  t.true(callbackB.calledOnce);
  t.true(callbackC.calledOnce);
});

test('flush - respond with an error', async (t) => {
  const client = createClient();
  const callback = spy();

  client.queue = [
    {
      message: 'error',
      callback,
    },
  ];

  await t.throws(client.flush(), 'Bad Request');
});

test('flush - time out if configured', async (t) => {
  const client = createClient({ timeout: 500 });
  const callback = spy();

  client.queue = [
    {
      message: 'timeout',
      callback,
    },
  ];

  await t.throws(client.flush(), `network timeout at: ${host}:${port}/`);
});

test('flush - skip when client is disabled', async (t) => {
  const client = createClient({ enable: false });
  const callback = spy();

  client.queue = [
    {
      message: 'test',
      callback,
    },
  ];

  await client.flush();

  t.false(callback.called);
});

test('identify - enqueue a message', (t) => {
  const client = createClient();
  stub(client, 'enqueue');

  const message = { userId: 'id' };
  client.identify(message, noop);

  t.true(client.enqueue.calledOnce);
  t.deepEqual(client.enqueue.firstCall.args, ['identify', message, noop]);
});

test('identify - require a userId or anonymousId', (t) => {
  const client = createClient();
  stub(client, 'enqueue');

  t.throws(() => client.identify(), 'You must pass a message object.');
  t.throws(() => client.identify({}), 'You must pass either an "anonymousId" or a "userId".');
  t.notThrows(() => client.identify({ userId: 'id' }));
  t.notThrows(() => client.identify({ anonymousId: 'id' }));
});

test('group - enqueue a message', (t) => {
  const client = createClient();
  stub(client, 'enqueue');

  const message = {
    groupId: 'id',
    userId: 'id',
  };

  client.group(message, noop);

  t.true(client.enqueue.calledOnce);
  t.deepEqual(client.enqueue.firstCall.args, ['group', message, noop]);
});

test('group - require a groupId and either userId or anonymousId', (t) => {
  const client = createClient();
  stub(client, 'enqueue');

  t.throws(() => client.group(), 'You must pass a message object.');
  t.throws(() => client.group({}), 'You must pass either an "anonymousId" or a "userId".');
  t.throws(() => client.group({ userId: 'id' }), 'You must pass a "groupId".');
  t.throws(() => client.group({ anonymousId: 'id' }), 'You must pass a "groupId".');
  t.notThrows(() => {
    client.group({
      groupId: 'id',
      userId: 'id',
    });
  });

  t.notThrows(() => {
    client.group({
      groupId: 'id',
      anonymousId: 'id',
    });
  });
});

test('track - enqueue a message', (t) => {
  const client = createClient();
  stub(client, 'enqueue');

  const message = {
    userId: 1,
    event: 'event',
  };

  client.track(message, noop);

  t.true(client.enqueue.calledOnce);
  t.deepEqual(client.enqueue.firstCall.args, ['track', message, noop]);
});

test('track - require event and either userId or anonymousId', (t) => {
  const client = createClient();
  stub(client, 'enqueue');

  t.throws(() => client.track(), 'You must pass a message object.');
  t.throws(() => client.track({}), 'You must pass either an "anonymousId" or a "userId".');
  t.throws(() => client.track({ userId: 'id' }), 'You must pass an "event".');
  t.throws(() => client.track({ anonymousId: 'id' }), 'You must pass an "event".');
  t.notThrows(() => {
    client.track({
      userId: 'id',
      event: 'event',
    });
  });

  t.notThrows(() => {
    client.track({
      anonymousId: 'id',
      event: 'event',
    });
  });
});

test('page - enqueue a message', (t) => {
  const client = createClient();
  stub(client, 'enqueue');

  const message = { userId: 'id' };
  client.page(message, noop);

  t.true(client.enqueue.calledOnce);
  t.deepEqual(client.enqueue.firstCall.args, ['page', message, noop]);
});

test('page - require either userId or anonymousId', (t) => {
  const client = createClient();
  stub(client, 'enqueue');

  t.throws(() => client.page(), 'You must pass a message object.');
  t.throws(() => client.page({}), 'You must pass either an "anonymousId" or a "userId".');
  t.notThrows(() => client.page({ userId: 'id' }));
  t.notThrows(() => client.page({ anonymousId: 'id' }));
});

test('screen - enqueue a message', (t) => {
  const client = createClient();
  stub(client, 'enqueue');

  const message = { userId: 'id' };
  client.screen(message, noop);

  t.true(client.enqueue.calledOnce);
  t.deepEqual(client.enqueue.firstCall.args, ['screen', message, noop]);
});

test('screen - require either userId or anonymousId', (t) => {
  const client = createClient();
  stub(client, 'enqueue');

  t.throws(() => client.screen(), 'You must pass a message object.');
  t.throws(() => client.screen({}), 'You must pass either an "anonymousId" or a "userId".');
  t.notThrows(() => client.screen({ userId: 'id' }));
  t.notThrows(() => client.screen({ anonymousId: 'id' }));
});

test('alias - enqueue a message', (t) => {
  const client = createClient();
  stub(client, 'enqueue');

  const message = {
    userId: 'id',
    previousId: 'id',
  };

  client.alias(message, noop);

  t.true(client.enqueue.calledOnce);
  t.deepEqual(client.enqueue.firstCall.args, ['alias', message, noop]);
});

test('alias - require previousId and userId', (t) => {
  const client = createClient();
  stub(client, 'enqueue');

  t.throws(() => client.alias(), 'You must pass a message object.');
  t.throws(() => client.alias({}), 'You must pass a "userId".');
  t.throws(() => client.alias({ userId: 'id' }), 'You must pass a "previousId".');
  t.notThrows(() => {
    client.alias({
      userId: 'id',
      previousId: 'id',
    });
  });
});

test('isErrorRetryable', (t) => {
  const client = createClient();

  // test error cases
  t.true(client.isErrorRetryable(0, {}, {}));
  t.true(client.isErrorRetryable(0, { code: 'ETIMEDOUT' }, {}));
  t.true(client.isErrorRetryable(0, { code: 'ECONNABORTED' }, {}));

  // test network request cases
  t.true(client.isErrorRetryable(0, null, { status: 500 }));
  t.true(client.isErrorRetryable(0, null, { status: 429 }));
  // do not retry after 3 attempts
  t.false(client.isErrorRetryable(3, null, { status: 429 }));
  // do not retry on success
  t.false(client.isErrorRetryable(0, null, { status: 200 }));
});

test('allows messages > 32kb', (t) => {
  const client = createClient();

  const event = {
    userId: 1,
    event: 'event',
    properties: {},
  };
  for (let i = 0; i < 100; i++) {
    event.properties[i] = 'a';
  }

  t.notThrows(() => {
    client.track(event, noop);
  });
});
