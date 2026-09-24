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
async function signup(name) {
  counter++;
  const result = await request('/auth/signup', {
    name,
    email: `transfer-${counter}-${Date.now()}@example.test`,
    password: `a-long-transfer-password-${counter}`,
    context: 'Founder',
  });
  assert.equal(result.status, 201);
  return result.cookie;
}
async function state(cookie) {
  return (await request('/state', undefined, cookie, 'GET')).data;
}
async function goal(cookie, title = 'A personal career goal') {
  const created = await request(
    '/objectives',
    { title, description: '', context: 'Founder', priority: 'High', status: 'Active', targetDate: '', constraints: '', success: '' },
    cookie,
  );
  assert.equal(created.status, 201);
  return created.data;
}

test('promoting a personal goal into an org workspace is explicit, resolvable by org members, and revocable', async () => {
  const orgOwner = await signup('Org Owner');
  const member = await signup('Org Member');
  const orgWorkspaceId = (await state(orgOwner)).workspace.id;
  const memberEmail = (await state(member)).user.email;
  await store.db.prepare('UPDATE workspaces SET member_limit = 10 WHERE id = ?').run(orgWorkspaceId);

  const added = await request('/admin/members', { email: memberEmail }, orgOwner);
  assert.equal(added.status, 201);

  // The member's own default workspace is their personal one; they create the goal there.
  const personalGoal = await goal(member);
  const personalWorkspaceId = (await state(member)).workspace.id;
  assert.notEqual(personalWorkspaceId, orgWorkspaceId);

  const promoted = await request(
    '/context-transfers',
    { targetWorkspaceId: orgWorkspaceId, recordKind: 'objective', recordId: personalGoal.id, action: 'promote' },
    member,
  );
  assert.equal(promoted.status, 201);
  assert.equal(promoted.data.status, 'active');
  assert.equal(promoted.data.target_record_id, null, 'promote/reference does not copy content, only a pointer');

  // Switch the member session into the org workspace and confirm the org owner (a different
  // person, same target workspace) can resolve the promoted goal.
  const switched = await request('/workspace/switch', { workspaceId: orgWorkspaceId }, orgOwner);
  assert.equal(switched.status, 200);
  const resolvedByOwner = await request(`/context-transfers/${promoted.data.id}/resolve`, undefined, orgOwner, 'GET');
  assert.equal(resolvedByOwner.status, 200);
  assert.equal(resolvedByOwner.data.data.title, 'A personal career goal');

  // A stranger with no membership in the org workspace cannot even initiate a transfer into it.
  const stranger = await signup('Stranger');
  const strangerGoal = await goal(stranger, 'Unrelated goal');
  const blocked = await request(
    '/context-transfers',
    { targetWorkspaceId: orgWorkspaceId, recordKind: 'objective', recordId: strangerGoal.id, action: 'reference' },
    stranger,
  );
  assert.equal(blocked.status, 403);

  // Revoke: the member switches back to their personal (source) workspace to revoke — org
  // members can no longer resolve it afterward.
  await request('/workspace/switch', { workspaceId: personalWorkspaceId }, member);
  const revoked = await request(`/context-transfers/${promoted.data.id}/revoke`, {}, member);
  assert.equal(revoked.status, 200);
  assert.equal(revoked.data.status, 'revoked');

  const resolveAfterRevoke = await request(`/context-transfers/${promoted.data.id}/resolve`, undefined, orgOwner, 'GET');
  assert.equal(resolveAfterRevoke.status, 403);
});

test('a copy transfer produces an independent record that cannot be revoked, and anonymize strips narrative fields', async () => {
  const orgOwner = await signup('Copy Org Owner');
  const member = await signup('Copy Org Member');
  const orgWorkspaceId = (await state(orgOwner)).workspace.id;
  const memberEmail = (await state(member)).user.email;
  await store.db.prepare('UPDATE workspaces SET member_limit = 10 WHERE id = ?').run(orgWorkspaceId);
  await request('/admin/members', { email: memberEmail }, orgOwner);

  const personalGoal = await request(
    '/objectives',
    { title: 'Copy me', description: 'Private narrative detail', context: 'Founder', priority: 'High', status: 'Active', targetDate: '', constraints: 'secret constraint', success: '' },
    member,
  );
  assert.equal(personalGoal.status, 201);

  const copied = await request(
    '/context-transfers',
    { targetWorkspaceId: orgWorkspaceId, recordKind: 'objective', recordId: personalGoal.data.id, action: 'copy' },
    member,
  );
  assert.equal(copied.status, 201);
  assert.ok(copied.data.target_record_id, 'copy produces a real independent target record');

  const cannotRevoke = await request(`/context-transfers/${copied.data.id}/revoke`, {}, member);
  assert.equal(cannotRevoke.status, 400);

  const anonymized = await request(
    '/context-transfers',
    { targetWorkspaceId: orgWorkspaceId, recordKind: 'objective', recordId: personalGoal.data.id, action: 'anonymize' },
    member,
  );
  assert.equal(anonymized.status, 201);
  const anonRow = await store.db
    .prepare("SELECT data FROM records WHERE id = ? AND workspace_id = ? AND kind = 'objective'")
    .get(anonymized.data.target_record_id, orgWorkspaceId);
  assert.ok(anonRow, 'the anonymized record must exist in the target workspace');
  const anonData = JSON.parse(anonRow.data);
  assert.equal(anonData.title, 'Copy me');
  assert.equal(anonData.description, undefined, 'narrative field must be stripped by anonymize');
  assert.equal(anonData.constraints, undefined, 'narrative field must be stripped by anonymize');
});
