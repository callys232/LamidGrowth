import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app/app.mjs';

let app, store, admin;
before(async () => {
  ({ app, store } = await createApp({
    filename: ':memory:',
    securityKey: 'ac'.repeat(32),
    publicOrigin: 'https://test.example',
    mailProvider: null,
    rateLimits: { api: { max: 1000 }, auth: { max: 1000 }, mutation: { max: 1000 } },
    ecosystemAdminEmails: ['au03-admin@example.test'],
  }));
  const signedUp = await request('/auth/signup', {
    name: 'AU03 Admin',
    email: 'au03-admin@example.test',
    password: 'a-long-au03-admin-password',
    context: 'Founder',
  });
  assert.equal(signedUp.status, 201);
  admin = signedUp.cookie;
});
after(async () => {
  await store.dropSchema();
});
async function request(path, body, cookie, method) {
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const verb = method || (body === undefined ? 'GET' : 'POST');
  const response = await fetch(`${base}/api${path}`, {
    method: verb,
    headers: {
      ...(['GET', 'HEAD', 'OPTIONS'].includes(verb) ? {} : { 'Content-Type': 'application/json' }),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = {
    status: response.status,
    data: response.status === 204 ? null : await response.json(),
    cookie: response.headers.get('set-cookie')?.split(';')[0],
  };
  await new Promise((resolve) => server.close(resolve));
  return result;
}
let counter = 0;
async function signup(context) {
  counter++;
  const result = await request('/auth/signup', {
    name: 'AU03 User',
    email: `au03-${counter}-${Date.now()}@example.test`,
    password: `a-long-au03-password-${counter}`,
    context,
  });
  assert.equal(result.status, 201);
  return result.cookie;
}

test('AU-03: selecting "Enterprise" as an audience context does not itself grant enterprise tier', async () => {
  const cookie = await signup('Enterprise');
  const state = await request('/state', undefined, cookie, 'GET');
  assert.equal(state.status, 200);
  assert.equal(state.data.workspace.context, 'Enterprise', 'the audience label is still recorded for UX purposes');
  assert.equal(state.data.workspace.tier, 'individual', 'but it must not itself confer a paid/verified entitlement tier');
  assert.equal(state.data.workspace.member_limit, 1);
});

test('AU-03: only an ecosystem admin can grant a workspace a higher tier, and it is auditable', async () => {
  const cookie = await signup('Founder');
  const nonAdmin = await signup('Founder');
  const workspaceId = (await request('/state', undefined, cookie, 'GET')).data.workspace.id;

  const deniedByNonAdmin = await request(`/admin/workspaces/${workspaceId}/tier`, { tier: 'enterprise' }, nonAdmin, 'POST');
  assert.equal(deniedByNonAdmin.status, 403);

  const granted = await request(`/admin/workspaces/${workspaceId}/tier`, { tier: 'enterprise' }, admin, 'POST');
  assert.equal(granted.status, 200);
  assert.equal(granted.data.tier, 'enterprise');

  const stateAfter = await request('/state', undefined, cookie, 'GET');
  assert.equal(stateAfter.data.workspace.tier, 'enterprise');
  assert.ok(stateAfter.data.workspace.member_limit > 1, 'granting enterprise tier also raises the member limit');
});

test('AU-03: an invalid tier value is rejected', async () => {
  const target = await signup('Founder');
  const workspaceId = (await request('/state', undefined, target, 'GET')).data.workspace.id;

  const attempt = await request(`/admin/workspaces/${workspaceId}/tier`, { tier: 'god_mode' }, admin, 'POST');
  assert.equal(attempt.status, 400);
});
