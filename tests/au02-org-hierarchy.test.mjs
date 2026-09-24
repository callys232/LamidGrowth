import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app/app.mjs';

let app, store;
before(async () => {
  ({ app, store } = await createApp({
    filename: ':memory:',
    securityKey: 'ac'.repeat(32),
    publicOrigin: 'https://test.example',
    mailProvider: null,
    rateLimits: { api: { max: 1000 }, auth: { max: 1000 }, mutation: { max: 1000 } },
  }));
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
    name: 'AU02 User',
    email: `au02-${counter}-${Date.now()}@example.test`,
    password: `a-long-au02-password-${counter}`,
    context,
  });
  assert.equal(result.status, 201);
  return result.cookie;
}

test('AU-02: a workspace can create a child workspace it did not previously own, without violating the one-self-owned-workspace-per-user rule', async () => {
  const parentCookie = await signup('Institution');
  const parentState = (await request('/state', undefined, parentCookie, 'GET')).data;
  assert.equal(parentState.workspace.role, 'owner');

  const child = await request(
    '/workspace/children',
    { name: 'UNICEF Nigeria', context: 'Institution' },
    parentCookie,
  );
  assert.equal(child.status, 201);
  assert.equal(child.data.name, 'UNICEF Nigeria');
  assert.equal(child.data.parent_workspace_id, parentState.workspace.id);

  // The same admin already owns the parent workspace (workspaces.user_id) — creating a second,
  // owned child must not violate the schema's old one-owned-workspace-per-user assumption.
  const owned = await store.db
    .prepare('SELECT id FROM workspaces WHERE user_id = ?')
    .all(parentState.user.id);
  assert.equal(owned.length, 2);
});

test('AU-02: creating and listing children requires workspace:manage permission, not just membership', async () => {
  const ownerCookie = await signup('Institution');
  const ownerState = (await request('/state', undefined, ownerCookie, 'GET')).data;

  const memberCookie = await signup('Institution');
  const memberState = (await request('/state', undefined, memberCookie, 'GET')).data;
  await store.db
    .prepare('INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)')
    .run(ownerState.workspace.id, memberState.user.id, 'member', 'active', Date.now());
  // Switch the member's session into the owner's workspace to exercise the permission gate
  // itself, not membership.
  await store.db
    .prepare('UPDATE sessions SET workspace_id = ? WHERE user_id = ?')
    .run(ownerState.workspace.id, memberState.user.id);

  const denied = await request(
    '/workspace/children',
    { name: 'Should not be created', context: 'Institution' },
    memberCookie,
  );
  assert.equal(denied.status, 403);

  const created = await request(
    '/workspace/children',
    { name: 'Allowed child', context: 'Institution' },
    ownerCookie,
  );
  assert.equal(created.status, 201);

  const deniedList = await request('/workspace/children', undefined, memberCookie, 'GET');
  assert.equal(deniedList.status, 403);

  const list = await request('/workspace/children', undefined, ownerCookie, 'GET');
  assert.equal(list.status, 200);
  assert.equal(list.data.length, 1);
  assert.equal(list.data[0].name, 'Allowed child');
  assert.equal(list.data[0].memberCount, 1);
});

test('AU-02: a child workspace is fully independent — its own owner controls it, unaffected by the parent', async () => {
  const parentCookie = await signup('Institution');
  const child = await request(
    '/workspace/children',
    { name: 'Independent Child', context: 'Institution' },
    parentCookie,
  );
  assert.equal(child.status, 201);

  // The creating admin is the child's owner too (consistent with how signup makes its creator
  // an owner), and can manage the child workspace directly, e.g. rename it.
  await store.db.prepare('UPDATE sessions SET workspace_id = ? WHERE user_id = (SELECT user_id FROM workspaces WHERE id = ?)')
    .run(child.data.id, child.data.id);
  const asChild = (await request('/state', undefined, parentCookie, 'GET')).data;
  assert.equal(asChild.workspace.id, child.data.id);
  assert.equal(asChild.workspace.role, 'owner');
  const rename = await request('/workspace', { name: 'Renamed Child' }, parentCookie, 'PATCH');
  assert.equal(rename.status, 200);
});
