import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createFundedTestApp as createApp } from './support/funded-app.mjs';

let app, store, server, base;
before(async () => {
  ({ app, store } = await createApp({
    filename: ':memory:',
    rateLimits: { api: { max: 1000 }, auth: { max: 1000 }, mutation: { max: 1000 } },
    // Tests below drive a real companion message through context-curator (a paid specialist),
    // which needs AI configured the way production would have it — same stub pattern as
    // tests/agents.test.mjs. Demo accounts are deliberately barred from external AI (see
    // aiPolicy.mjs), so these use a real signed-up, verified account instead.
    aiProvider: {
      name: 'test',
      model: 'test',
      async review(context) {
        return {
          review: {
            summary: `AI summary: ${context.question}`,
            assumptions: [],
            suggestions: [],
            evidenceIds: (context.sources || []).map((s) => s.id),
          },
        };
      },
    },
  }));
  server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await store.db.close();
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
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get('set-cookie')?.split(';')[0],
  };
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
let userCounter = 0;
async function authedUser() {
  userCounter++;
  const signup = await request(
    '/auth/signup',
    {
      name: 'Models Tester',
      email: `models-${userCounter}-${Date.now()}@example.test`,
      password: 'a-long-models-test-password',
      context: 'Founder',
    },
    undefined,
  );
  assert.equal(signup.status, 201);
  const cookie = signup.cookie;
  await request('/auth/verify', { token: signup.data.verificationToken }, cookie);
  await request('/ai/settings', { enabled: true, dailyLimit: 10, version: 0 }, cookie, 'PATCH');
  return cookie;
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
    'companion.contract-builder',
    'companion.deliverable-builder',
    'companion.deliverable-verification',
    'companion.diagnostic-intelligence',
    'companion.experiment-builder',
    'companion.goal-advisor',
    'companion.market-intelligence',
    'companion.opportunity-signals',
    'companion.performance-analytics',
    'companion.proposal-drafter',
    'companion.scope-builder',
    'companion.signal-monitoring',
    'companion.sow-builder',
  ]);
  assert.ok(result.data.every((row) => row.status === 'approved'));
});

test('companion agent evidence records which registry entry authorized the call', async () => {
  const cookie = await authedUser();
  const result = await request(
    '/companion/messages',
    { message: 'what is going on right now?', consent: true },
    cookie,
  );
  assert.equal(result.status, 201);
  assert.equal(result.data.evidence.modelRegistryId, 'companion-context-v1');
});

test('F-AI-01: an executed companion call leaves real provenance of the provider/model that ran it', async () => {
  const cookie = await authedUser();
  const before = await request('/models/executions?useCase=companion.context-curator', undefined, cookie, 'GET');
  assert.equal(before.status, 200);
  const beforeCount = before.data.length;

  const result = await request(
    '/companion/messages',
    { message: 'what is going on right now?', consent: true },
    cookie,
  );
  assert.equal(result.status, 201);

  const after = await request('/models/executions?useCase=companion.context-curator', undefined, cookie, 'GET');
  assert.equal(after.status, 200);
  assert.equal(after.data.length, beforeCount + 1, 'a real AI-backed call must leave one new execution record');
  assert.equal(after.data[0].provider, 'test');
  assert.equal(after.data[0].model, 'test');
  assert.equal(after.data[0].model_registry_id, 'companion-context-v1');
});

test('deprecating a use case blocks the agent instead of silently proceeding', async () => {
  const cookie = await authedUser();
  await store.db
    .prepare("UPDATE model_registry SET status = 'deprecated' WHERE id = 'companion-context-v1'")
    .run();
  const result = await request(
    '/companion/messages',
    { message: 'what is going on right now?', consent: true },
    cookie,
  );
  assert.equal(result.status, 503);
  // restore for any later tests in this file
  await store.db
    .prepare("UPDATE model_registry SET status = 'approved' WHERE id = 'companion-context-v1'")
    .run();
});
