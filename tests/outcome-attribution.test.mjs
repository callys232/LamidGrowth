import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createFundedTestApp as createApp } from './support/funded-app.mjs';

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
  await store.dropSchema();
});
async function request(path, body, cookie, method) {
  const verb = method || (body === undefined ? 'GET' : 'POST');
  const response = await fetch(`${base}/api${path}`, {
    method: verb,
    headers: {
      ...(['GET', 'HEAD', 'OPTIONS'].includes(verb) ? {} : { 'Content-Type': 'application/json' }),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: response.status,
    data: response.status === 204 ? null : await response.json(),
    cookie: response.headers.get('set-cookie')?.split(';')[0],
  };
}
let counter = 0;
async function signup() {
  counter++;
  const result = await request('/auth/signup', {
    name: 'Outcome Owner',
    email: `outcome-attr-${counter}-${Date.now()}@example.test`,
    password: `a-long-outcome-password-${counter}`,
    context: 'Founder',
  });
  assert.equal(result.status, 201);
  return result.cookie;
}

test('an outcome can be recorded against a subject with an honest attribution strength, and listed', async () => {
  const cookie = await signup();
  const created = await request(
    '/outcome-records',
    { subjectKind: 'goal', subjectId: 'goal-123', description: 'Conversion rose after the redesign shipped.', attributionStrength: 'likely_contribution' },
    cookie,
  );
  assert.equal(created.status, 201);
  assert.equal(created.data.attribution_strength, 'likely_contribution');

  const listed = await request('/outcome-records?subjectKind=goal&subjectId=goal-123', undefined, cookie, 'GET');
  assert.equal(listed.status, 200);
  assert.equal(listed.data.length, 1);
});

test('an invalid attribution strength is rejected rather than silently defaulting to a stronger claim', async () => {
  const cookie = await signup();
  const attempt = await request(
    '/outcome-records',
    { subjectKind: 'goal', subjectId: 'goal-123', description: 'x', attributionStrength: 'definitely_caused_it' },
    cookie,
  );
  assert.equal(attempt.status, 400);
});

test('linking an outcome to a nonexistent recommendation in this workspace is rejected', async () => {
  const cookie = await signup();
  const attempt = await request(
    '/outcome-records',
    {
      subjectKind: 'goal',
      subjectId: 'goal-123',
      recommendationId: '00000000-0000-0000-0000-000000000000',
      description: 'x',
      attributionStrength: 'correlation',
    },
    cookie,
  );
  assert.equal(attempt.status, 404);
});
