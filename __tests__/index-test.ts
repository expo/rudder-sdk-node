import fetch from 'node-fetch';

import Analytics from '..';

const testKey = 'test';
const testDataPlane = 'https://cdp.example/v1/batch';
const testUserId = 'tester';

afterEach(() => {
  (fetch as any).reset();
});

test(`requires an API write key and data plane URL`, () => {
  expect(() => new Analytics(null as any, testDataPlane)).toThrowError(
    `The project's write key must be specified`
  );
  expect(() => new Analytics(testKey, null as any)).toThrowError(
    `The data plane URL must be specified`
  );
});

test(`sends the message type to the data plane server`, (done) => {
  (fetch as any).mock(testDataPlane, {});
  const analytics = new Analytics(testKey, testDataPlane);
  analytics.identify({ userId: testUserId }, () => {
    const [, options] = (fetch as any).lastCall(testDataPlane);
    expect(JSON.parse(options.body).batch[0].type).toBe('identify');
    done();
  });
});
