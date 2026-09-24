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
    name: 'Version Owner',
    email: `version-${counter}-${Date.now()}@example.test`,
    password: `a-long-version-password-${counter}`,
    context: 'Founder',
  });
  assert.equal(result.status, 201);
  return result.cookie;
}

test('a scoping case accumulates a version per save, each snapshot distinct and attributed', async () => {
  const cookie = await signup();
  const created = await request('/scoping-cases', { objective: 'Build a landing page', problemStatement: '' }, cookie);
  assert.equal(created.status, 201);

  await request(`/scoping-cases/${created.data.id}`, { deliverables: 'A single responsive page.' }, cookie, 'PATCH');
  await request(`/scoping-cases/${created.data.id}`, { budgetContext: '$500-800', reason: 'Added budget after client call.' }, cookie, 'PATCH');

  const versions = await request(`/scoping-cases/${created.data.id}/versions`, undefined, cookie, 'GET');
  assert.equal(versions.status, 200);
  assert.equal(versions.data.length, 3, 'creation + two patches = three versions');
  assert.equal(versions.data[0].version, 1);
  assert.equal(versions.data[0].source, 'user');
  assert.equal(versions.data[1].snapshot.deliverables, 'A single responsive page.');
  assert.equal(versions.data[2].snapshot.budgetContext ?? versions.data[2].snapshot.budget_context, '$500-800');
  assert.equal(versions.data[2].reason, 'Added budget after client call.');

  const stranger = await signup();
  assert.equal((await request(`/scoping-cases/${created.data.id}/versions`, undefined, stranger, 'GET')).status, 403);
});
