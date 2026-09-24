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
    name: 'Guidance Owner',
    email: `guidance-${counter}-${Date.now()}@example.test`,
    password: `a-long-guidance-password-${counter}`,
    context: 'Founder',
  });
  assert.equal(result.status, 201);
  return result.cookie;
}

test('field guidance exposes Explain, Example, Suggest and Help-me-decide for an empty field', async () => {
  const cookie = await signup();
  const created = await request('/scoping-cases', { objective: 'Launch a new landing page', problemStatement: '' }, cookie);
  assert.equal(created.status, 201);

  const guidance = await request(`/scoping-cases/${created.data.id}/guidance/deliverables`, undefined, cookie, 'GET');
  assert.equal(guidance.status, 200);
  assert.equal(guidance.data.field, 'deliverables');
  assert.ok(guidance.data.explain.length > 0);
  assert.ok(guidance.data.example.length > 0);
  assert.ok(guidance.data.helpMeDecide.length >= 1);
  assert.ok(guidance.data.suggestion, 'an empty deliverables field should get a suggestion');
  assert.equal(guidance.data.currentValue, '');
});

test('field guidance returns no suggestion once a field is already filled', async () => {
  const cookie = await signup();
  const created = await request('/scoping-cases', { objective: 'Launch a new landing page', problemStatement: '' }, cookie);
  await request(`/scoping-cases/${created.data.id}`, { deliverables: 'A redesigned landing page.' }, cookie, 'PATCH');

  const guidance = await request(`/scoping-cases/${created.data.id}/guidance/deliverables`, undefined, cookie, 'GET');
  assert.equal(guidance.status, 200);
  assert.equal(guidance.data.suggestion, null);
  assert.equal(guidance.data.currentValue, 'A redesigned landing page.');
});

test('an unknown field or a stranger is rejected', async () => {
  const cookie = await signup();
  const created = await request('/scoping-cases', { objective: 'Launch a new landing page', problemStatement: '' }, cookie);

  assert.equal((await request(`/scoping-cases/${created.data.id}/guidance/notAField`, undefined, cookie, 'GET')).status, 404);

  const stranger = await signup();
  assert.equal((await request(`/scoping-cases/${created.data.id}/guidance/deliverables`, undefined, stranger, 'GET')).status, 403);
});
