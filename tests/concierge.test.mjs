import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app/app.mjs';

let app, store, server, base, adminCookie;
const adminEmail = 'admin@lamidgrowth.test';
before(async () => {
  ({ app, store } = createApp({
    filename: ':memory:',
    rateLimits: { api: { max: 1000 }, auth: { max: 1000 }, mutation: { max: 1000 }, spend: { max: 1000 } },
    ecosystemAdminEmails: [adminEmail],
  }));
  server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  base = `http://127.0.0.1:${server.address().port}`;
  adminCookie = await signup('Ecosystem Admin', adminEmail);
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
async function signup(name, email, context = 'Founder') {
  counter++;
  const result = await request('/auth/signup', {
    name,
    email: email || `concierge-${counter}-${Date.now()}@example.test`,
    password: `a-long-concierge-password-${counter}`,
    context,
  });
  assert.equal(result.status, 201);
  return result.cookie;
}

test('a user applies, a non-admin cannot approve, an ecosystem admin can', async () => {
  const applicant = await signup('Provider Applicant');
  const nonAdmin = await signup('Regular User');
  const admin = adminCookie;

  const application = await request('/concierge/applications', { headline: 'Senior PM, 8 years', experience: 'Managed 40+ projects.' }, applicant);
  assert.equal(application.status, 201);
  assert.equal(application.data.status, 'pending');

  const blockedList = await request('/admin/concierge-applications', undefined, nonAdmin, 'GET');
  assert.equal(blockedList.status, 403);
  const blockedDecision = await request(`/admin/concierge-applications/${application.data.id}`, { decision: 'approve' }, nonAdmin, 'PATCH');
  assert.equal(blockedDecision.status, 403);

  const list = await request('/admin/concierge-applications', undefined, admin, 'GET');
  assert.equal(list.status, 200);
  assert.equal(list.data.length, 1);

  const decision = await request(`/admin/concierge-applications/${application.data.id}`, { decision: 'approve' }, admin, 'PATCH');
  assert.equal(decision.status, 200);
  assert.equal(decision.data.status, 'approved');

  const providers = await request('/concierge/providers', undefined, applicant, 'GET');
  assert.equal(providers.status, 200);
  assert.equal(providers.data.length, 1);
  assert.equal(providers.data[0].headline, 'Senior PM, 8 years');
});

test('a duplicate application while pending or approved is rejected', async () => {
  const applicant = await signup('Repeat Applicant');
  const first = await request('/concierge/applications', { headline: 'PM', experience: '' }, applicant);
  assert.equal(first.status, 201);
  const second = await request('/concierge/applications', { headline: 'PM again', experience: '' }, applicant);
  assert.equal(second.status, 409);
});

test('an owner can only assign an approved provider, and only one active concierge at a time', async () => {
  const owner = await signup('Client Owner');
  const admin = adminCookie;
  const unapproved = await signup('Unapproved Provider');
  const approvedProvider = await signup('Approved Provider');
  const approvedState = (await request('/state', undefined, approvedProvider, 'GET')).data;
  const unapprovedState = (await request('/state', undefined, unapproved, 'GET')).data;

  const pendingApp = await request('/concierge/applications', { headline: 'Not yet approved', experience: '' }, unapproved);
  void pendingApp;
  const approvedApp = await request('/concierge/applications', { headline: 'Approved PM', experience: '' }, approvedProvider);
  await request(`/admin/concierge-applications/${approvedApp.data.id}`, { decision: 'approve' }, admin, 'PATCH');

  const rejectedAssign = await request('/workspace/concierge', { userId: unapprovedState.user.id }, owner);
  assert.equal(rejectedAssign.status, 400);

  const assign = await request('/workspace/concierge', { userId: approvedState.user.id }, owner);
  assert.equal(assign.status, 201);

  // A second concierge cannot be assigned while one is active.
  const secondApplicant = await signup('Second Provider');
  const secondState = (await request('/state', undefined, secondApplicant, 'GET')).data;
  const secondApp = await request('/concierge/applications', { headline: 'Second PM', experience: '' }, secondApplicant);
  await request(`/admin/concierge-applications/${secondApp.data.id}`, { decision: 'approve' }, admin, 'PATCH');
  const secondAssign = await request('/workspace/concierge', { userId: secondState.user.id }, owner);
  assert.equal(secondAssign.status, 409);

  // The assigned concierge switches into the client's workspace and gets elevated-but-scoped authority.
  const ownerState = (await request('/state', undefined, owner, 'GET')).data;
  const switched = await request('/workspace/switch', { workspaceId: ownerState.workspace.id }, approvedProvider);
  assert.equal(switched.status, 200);

  const concierState = (await request('/state', undefined, approvedProvider, 'GET')).data;
  assert.equal(concierState.workspace.role, 'concierge');
  assert.ok(concierState.permissions.includes('workspace:manage'));
  assert.ok(!concierState.permissions.includes('members:manage'));
  assert.ok(!concierState.permissions.includes('workspace:export'));

  // A member-management action is still blocked for the concierge.
  const blockedMemberAction = await request('/admin/members', { email: approvedState.user.email }, approvedProvider);
  assert.equal(blockedMemberAction.status, 403);
});
