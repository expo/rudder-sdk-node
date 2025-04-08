import fetchMock from 'fetch-mock';

fetchMock.mockGlobal();

// eslint-disable-next-line import/first
import Analytics from '..';

const testKey = 'test';
const testDataPlane = 'https://cdp.example/v1/batch';
const testUserId = 'tester';

beforeEach(() => {
  fetchMock.removeRoutes();
  fetchMock.clearHistory();
});

test(`requires an API write key and data plane URL`, () => {
  expect(() => new Analytics(null as any, testDataPlane)).toThrowError(
    `The project's write key must be specified`,
  );
  expect(() => new Analytics(testKey, null as any)).toThrowError(
    `The data plane URL must be specified`,
  );
});

test(`sends the message type to the data plane server`, async () => {
  fetchMock.post(testDataPlane, {});
  const analytics = new Analytics(testKey, testDataPlane);
  analytics.identify({ userId: testUserId });
  await analytics.flush();
  const options = fetchMock.callHistory.lastCall(testDataPlane)?.options;
  expect(JSON.parse(options!.body as any).batch[0].type).toBe('identify');
});
