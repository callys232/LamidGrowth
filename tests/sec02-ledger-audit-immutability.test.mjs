import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app/app.mjs';

let app, store, admin, adminPassword;
before(async () => {
  ({ app, store } = await createApp({
    filename: ':memory:',
    securityKey: 'ac'.repeat(32),
    publicOrigin: 'https://test.example',
    mailProvider: null,
    rateLimits: { api: { max: 1000 }, auth: { max: 1000 }, mutation: { max: 1000 } },
    ecosystemAdminEmails: ['sec02-admin@example.test'],
  }));
  adminPassword = 'a-long-sec02-admin-password';
  const signedUp = await request('/auth/signup', {
    name: 'SEC02 Admin',
    email: 'sec02-admin@example.test',
    password: adminPassword,
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

test('SEC-02: points_ledger rows cannot be deleted or updated outside an admin account purge', async () => {
  const id = randomUUID();
  const adminUserId = (await request('/state', undefined, admin, 'GET')).data.user.id;
  await store.db
    .prepare('INSERT INTO points_ledger (id, user_id, amount, reason, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, adminUserId, 5, 'test', Date.now());
  await assert.rejects(
    () => store.db.prepare('DELETE FROM points_ledger WHERE id = ?').run(id),
    /append-only and cannot be deleted/,
  );
  await assert.rejects(
    () => store.db.prepare('UPDATE points_ledger SET amount = 999 WHERE id = ?').run(id),
    /immutable and cannot be updated/,
  );
});

test('SEC-02: audit rows cannot be deleted or updated outside an admin account purge', async () => {
  const id = randomUUID();
  const adminUserId = (await request('/state', undefined, admin, 'GET')).data.user.id;
  const workspaceId = (await request('/state', undefined, admin, 'GET')).data.workspace.id;
  await store.db
    .prepare(
      'INSERT INTO audit (id, workspace_id, actor, action, object_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .run(id, workspaceId, adminUserId, 'test_action', null, 'test detail', new Date().toISOString());
  await assert.rejects(
    () => store.db.prepare('DELETE FROM audit WHERE id = ?').run(id),
    /append-only and cannot be deleted/,
  );
  await assert.rejects(
    () => store.db.prepare("UPDATE audit SET detail = 'tampered' WHERE id = ?").run(id),
    /immutable and cannot be updated/,
  );
});

test('SEC-02: an ecosystem-admin-initiated account deletion physically purges the ledger and audit trail', async () => {
  const signedUp = await request('/auth/signup', {
    name: 'SEC02 Target',
    email: `sec02-target-${Date.now()}@example.test`,
    password: 'a-long-sec02-target-password',
    context: 'Founder',
  });
  assert.equal(signedUp.status, 201);
  const state = await request('/state', undefined, signedUp.cookie, 'GET');
  const userId = state.data.user.id;
  await store.db
    .prepare('INSERT INTO points_ledger (id, user_id, amount, reason, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(randomUUID(), userId, 10, 'test_fixture', Date.now());

  const deletion = await request(
    `/admin/users/${userId}`,
    { confirmation: 'DELETE USER ACCOUNT', password: adminPassword },
    admin,
    'DELETE',
  );
  assert.equal(deletion.status, 200);

  const after_ = await store.db
    .prepare('SELECT COUNT(*)::int AS count FROM points_ledger WHERE user_id = ?')
    .get(userId);
  assert.equal(after_.count, 0, 'the purge must physically remove the deleted user\'s ledger rows');

  const remainingUser = await store.db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  assert.equal(remainingUser, undefined);
});

test('SEC-02: only an ecosystem admin can delete a user account', async () => {
  const target = await request('/auth/signup', {
    name: 'SEC02 Nobody',
    email: `sec02-nobody-${Date.now()}@example.test`,
    password: 'a-long-sec02-nobody-password',
    context: 'Founder',
  });
  const other = await request('/auth/signup', {
    name: 'SEC02 Other',
    email: `sec02-other-${Date.now()}@example.test`,
    password: 'a-long-sec02-other-password',
    context: 'Founder',
  });
  const targetId = (await request('/state', undefined, target.cookie, 'GET')).data.user.id;

  const deniedSelf = await request(
    `/admin/users/${targetId}`,
    { confirmation: 'DELETE USER ACCOUNT', password: 'a-long-sec02-target-password' },
    target.cookie,
    'DELETE',
  );
  assert.equal(deniedSelf.status, 403);

  const deniedOther = await request(
    `/admin/users/${targetId}`,
    { confirmation: 'DELETE USER ACCOUNT', password: 'a-long-sec02-other-password' },
    other.cookie,
    'DELETE',
  );
  assert.equal(deniedOther.status, 403);
});
