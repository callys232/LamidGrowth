import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app/app.mjs';

let app, store, server, base;
before(async () => {
  ({ app, store } = await createApp({
    filename: ':memory:',
    rateLimits: { api: { max: 1000 }, auth: { max: 1000 }, mutation: { max: 1000 } },
  }));
  server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  store.db.close();
});
async function request(path, body, cookie, method = 'POST') {
  const response = await fetch(`${base}/api${path}`, {
    method: body === undefined ? 'GET' : method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, data: await response.json() };
}
async function demo() {
  const response = await fetch(`${base}/api/auth/demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(response.status, 201);
  return response.headers.get('set-cookie')?.split(';')[0];
}

test('the model registry is seeded with approved companion use cases', async () => {
  const cookie = await demo();
  const result = await request('/models', undefined, cookie, 'GET');
  assert.equal(result.status, 200);
  const useCases = result.data.map((row) => row.use_case).sort();
  assert.deepEqual(useCases, [
    'companion.acceptance-builder',
    'companion.brief-builder',
    'companion.capability-mapper',
    'companion.change-order',
    'companion.context-curator',
    'companion.deliverable-builder',
    'companion.deliverable-verification',
    'companion.diagnostic-intelligence',
    'companion.market-intelligence',
    'companion.performance-analytics',
    'companion.proposal-drafter',
    'companion.scope-builder',
    'companion.signal-monitoring',
    'companion.sow-builder',
  ]);
  assert.ok(result.data.every((row) => row.status === 'approved'));
});

test('companion agent evidence records which registry entry authorized the call', async () => {
  const cookie = await demo();
  const result = await request('/companion/messages', { message: 'what is going on right now?' }, cookie);
  assert.equal(result.status, 201);
  assert.equal(result.data.evidence.modelRegistryId, 'companion-context-v1');
});

test('deprecating a use case blocks the agent instead of silently proceeding', async () => {
  const cookie = await demo();
  await store.db
    .prepare("UPDATE model_registry SET status = 'deprecated' WHERE id = 'companion-context-v1'")
    .run();
  const result = await request(
    '/companion/messages',
    { message: 'what is going on right now?' },
    cookie,
  );
  assert.equal(result.status, 503);
  // restore for any later tests in this file
  await store.db
    .prepare("UPDATE model_registry SET status = 'approved' WHERE id = 'companion-context-v1'")
    .run();
});
