import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app/app.mjs';

let app, store, server, base;
before(async () => {
  ({ app, store } = createApp({
    filename: ':memory:',
    rateLimits: { api: { max: 1000 }, auth: { max: 1000 }, mutation: { max: 1000 }, spend: { max: 1000 } },
    enterpriseMemberLimit: 2,
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
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get('set-cookie')?.split(';')[0],
  };
}
let counter = 0;
async function signup(name, context = 'Founder') {
  counter++;
  const result = await request('/auth/signup', {
    name,
    email: `enterprise-${counter}-${Date.now()}@example.test`,
    password: `a-long-enterprise-password-${counter}`,
    context,
  });
  assert.equal(result.status, 201);
  return result.cookie;
}

test('a non-enterprise (individual) workspace cannot add members', async () => {
  const owner = await signup('Individual Owner', 'Founder');
  const invitee = await signup('Invitee');
  const inviteeState = (await request('/state', undefined, invitee, 'GET')).data;
  const add = await request('/admin/members', { email: inviteeState.user.email }, owner);
  assert.equal(add.status, 403);
});

test('an enterprise workspace rejects new members once member_limit is reached', async () => {
  const owner = await signup('Enterprise Owner', 'Enterprise');
  const first = await signup('First Member');
  const second = await signup('Second Member');
  const third = await signup('Third Member');
  const firstState = (await request('/state', undefined, first, 'GET')).data;
  const secondState = (await request('/state', undefined, second, 'GET')).data;
  const thirdState = (await request('/state', undefined, third, 'GET')).data;

  // enterpriseMemberLimit is 2, and the owner already occupies one seat.
  const addFirst = await request('/admin/members', { email: firstState.user.email }, owner);
  assert.equal(addFirst.status, 201);
  const addSecond = await request('/admin/members', { email: secondState.user.email }, owner);
  assert.equal(addSecond.status, 409);
  void thirdState;
});

test('a disabled member loses workspace access on their very next request', async () => {
  const owner = await signup('Disable Owner', 'Enterprise');
  const member = await signup('Disable Member');
  const memberState = (await request('/state', undefined, member, 'GET')).data;
  const add = await request('/admin/members', { email: memberState.user.email }, owner);
  assert.equal(add.status, 201);

  const ownerState = (await request('/state', undefined, owner, 'GET')).data;
  const switched = await request('/workspace/switch', { workspaceId: ownerState.workspace.id }, member);
  assert.equal(switched.status, 200);

  const workingState = await request('/state', undefined, member, 'GET');
  assert.equal(workingState.status, 200);
  assert.equal(workingState.data.workspace.id, ownerState.workspace.id);

  const disable = await request(`/admin/members/${memberState.user.id}`, { status: 'disabled' }, owner, 'PATCH');
  assert.equal(disable.status, 200);

  const afterDisable = await request('/state', undefined, member, 'GET');
  assert.notEqual(afterDisable.data.workspace?.id, ownerState.workspace.id);
});
