import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createFundedTestApp as createApp } from './support/funded-app.mjs';

let app, store, server, base, adminCookie;
const adminEmail = 'billing-admin@lamidgrowth.test';
before(async () => {
  ({ app, store } = await createApp({
    filename: ':memory:',
    rateLimits: { api: { max: 1000 }, auth: { max: 1000 }, mutation: { max: 1000 }, spend: { max: 1000 } },
    ecosystemAdminEmails: [adminEmail],
    // The no-concierge billing test below drives a real companion message through
    // signal-monitoring (a paid specialist), so it needs AI configured the way production would
    // have it — same stub pattern as tests/agents.test.mjs.
    aiProvider: {
      name: 'test',
      model: 'test',
      async review(context) {
        return {
          review: { summary: `AI summary: ${context.question}`, assumptions: [], suggestions: [], evidenceIds: (context.sources || []).map((s) => s.id) },
        };
      },
    },
  }));
  server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  base = `http://127.0.0.1:${server.address().port}`;
  adminCookie = await signup('Billing Ecosystem Admin', adminEmail);
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
async function signup(name, email) {
  counter++;
  const result = await request('/auth/signup', {
    name,
    email: email || `billing-${counter}-${Date.now()}@example.test`,
    password: `a-long-billing-password-${counter}`,
    context: 'Founder',
  });
  assert.equal(result.status, 201);
  const cookie = result.cookie;
  // External AI requires a verified account and workspace opt-in (see aiPolicy.mjs).
  await request('/auth/verify', { token: result.data.verificationToken }, cookie);
  await request('/ai/settings', { enabled: true, dailyLimit: 10, version: 0 }, cookie, 'PATCH');
  return cookie;
}
async function approvedProvider(name, monthlyRateMinor = 20000) {
  const provider = await signup(name);
  const application = await request(
    '/concierge/applications',
    { headline: `${name} PM`, experience: '', monthlyRateMinor },
    provider,
  );
  await request(`/admin/concierge-applications/${application.data.id}`, { decision: 'approve' }, adminCookie, 'PATCH');
  const state = (await request('/state', undefined, provider, 'GET')).data;
  return { cookie: provider, userId: state.user.id };
}

test('a workspace with no concierge ever assigned has an empty concierge fee history but real points usage', async () => {
  const owner = await signup('No Concierge Owner');
  const companion = await request('/companion/messages', { message: 'what changed recently', consent: true }, owner);
  assert.equal(companion.status, 201, JSON.stringify(companion.data));
  const statement = await request('/billing/statement', undefined, owner, 'GET');
  assert.equal(statement.status, 200);
  assert.equal(statement.data.lineItems.length, 0);
  assert.equal(statement.data.totalMinor, 0);
  assert.equal(statement.data.pointsUsage.totalPointsSpent, 65);
  assert.equal(statement.data.pointsUsage.estimatedCostMinor, 650);
});

test('the ecosystem fee is charged once at assignment; the PM fee recurs every 30-day cycle', async () => {
  const owner = await signup('Concierge Billing Owner');
  const provider = await approvedProvider('Billed Provider', 20000);
  const assign = await request('/workspace/concierge', { userId: provider.userId }, owner);
  assert.equal(assign.status, 201);

  const ownerState = (await request('/state', undefined, owner, 'GET')).data;

  // Immediately after assignment: one one-time ecosystem fee, no PM cycles have elapsed yet.
  const immediateStatement = await request('/billing/statement', undefined, owner, 'GET');
  assert.equal(immediateStatement.data.lineItems.length, 1);
  assert.equal(immediateStatement.data.lineItems[0].kind, 'ecosystem_fee');
  assert.equal(immediateStatement.data.totalMinor, 50000);

  const sixtyFiveDaysAgo = Date.now() - 65 * 24 * 60 * 60 * 1000;
  await store.db
    .prepare("UPDATE workspace_members SET created_at = ? WHERE workspace_id = ? AND role = 'concierge'")
    .run(sixtyFiveDaysAgo, ownerState.workspace.id);

  const statement = await request('/billing/statement', undefined, owner, 'GET');
  assert.equal(statement.status, 200);
  // 1 one-time ecosystem fee + 2 elapsed 30-day PM-fee cycles = 3 line items.
  assert.equal(statement.data.lineItems.length, 3);
  assert.equal(statement.data.lineItems.filter((i) => i.kind === 'ecosystem_fee').length, 1);
  assert.equal(statement.data.lineItems.filter((i) => i.kind === 'pm_fee').length, 2);
  // 50000 ecosystem (once) + 2 x 20000 PM rate = 90000.
  assert.equal(statement.data.totalMinor, 90000);

  // Calling it again does not duplicate line items.
  const again = await request('/billing/statement', undefined, owner, 'GET');
  assert.equal(again.data.lineItems.length, 3);
  assert.equal(again.data.totalMinor, 90000);
});

test('the assigned concierge cannot view the billing statement', async () => {
  const owner = await signup('Blocked Concierge Owner');
  const provider = await approvedProvider('Blocked Provider');
  await request('/workspace/concierge', { userId: provider.userId }, owner);
  const ownerState = (await request('/state', undefined, owner, 'GET')).data;
  await request('/workspace/switch', { workspaceId: ownerState.workspace.id }, provider.cookie);
  const attempt = await request('/billing/statement', undefined, provider.cookie, 'GET');
  assert.equal(attempt.status, 403);
});
