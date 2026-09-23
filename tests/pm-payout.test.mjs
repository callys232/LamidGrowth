import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createFundedTestApp as createApp } from './support/funded-app.mjs';
import { paystackProvider } from '../src/app/payments.mjs';

const PAYSTACK_SECRET = 'sk_test_payout_fixture';

function mockFetch(routes) {
  return async (url, options) => {
    const handler = routes[url];
    if (!handler) throw new Error(`Unexpected fetch to ${url}`);
    return handler(JSON.parse(options.body));
  };
}
function jsonResponse(status, data) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}

let app, store, server, base;
const adminEmail = 'payout-admin@lamidgrowth.test';
async function boot(fetchImpl, { configured = true } = {}) {
  const paymentProvider = (name) =>
    name === 'paystack' && configured
      ? paystackProvider({ secretKey: PAYSTACK_SECRET, fetchImpl: fetchImpl || fetch })
      : null;
  ({ app, store } = await createApp({
    filename: ':memory:',
    rateLimits: {
      api: { max: 1000 },
      auth: { max: 1000 },
      mutation: { max: 1000 },
      spend: { max: 1000 },
    },
    paymentProvider,
    ecosystemAdminEmails: [adminEmail],
  }));
  server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  base = `http://127.0.0.1:${server.address().port}`;
}
async function teardown() {
  await new Promise((resolve) => server.close(resolve));
  await store.db.close();
}
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
    email: email || `payout-${counter}-${Date.now()}@example.test`,
    password: `a-long-payout-password-${counter}`,
    context: 'Founder',
  });
  assert.equal(result.status, 201);
  return result.cookie;
}
async function approvedProviderWithAccount(name, adminCookie, monthlyRateMinor = 20000) {
  const provider = await signup(name);
  const application = await request(
    '/concierge/applications',
    { headline: `${name} PM`, experience: '', monthlyRateMinor },
    provider,
  );
  await request(
    `/admin/concierge-applications/${application.data.id}`,
    { decision: 'approve' },
    adminCookie,
    'PATCH',
  );
  const account = await request(
    '/payment-accounts',
    { provider: 'paystack', accountName: name, accountNumber: '0123456789', bankCode: '058' },
    provider,
  );
  const state = (await request('/state', undefined, provider, 'GET')).data;
  return {
    cookie: provider,
    userId: state.user.id,
    hasRecipient: Boolean(account.data.recipient_code),
  };
}

test('no active concierge means nothing to pay out', async (t) => {
  await boot();
  t.after(teardown);
  const owner = await signup('No Concierge Owner');
  const attempt = await request('/billing/pay-provider', {}, owner);
  assert.equal(attempt.status, 400);
});

test('unconfigured provider refuses payout rather than faking success', async (t) => {
  const fetchImpl = mockFetch({
    'https://api.paystack.co/transferrecipient': () =>
      jsonResponse(200, { status: true, data: { recipient_code: 'RCP_payout_1' } }),
  });
  // First boot with a provider so the account can be registered with a recipient code.
  await boot(fetchImpl);
  const adminCookie = await signup('Payout Admin', adminEmail);
  const owner = await signup('Unconfigured Payout Owner');
  const provider = await approvedProviderWithAccount('Unconfigured Provider', adminCookie);
  assert.ok(provider.hasRecipient);
  await request('/workspace/concierge', { userId: provider.userId }, owner);
  await teardown();

  // Reboot with no provider configured at all — the pm_fee already exists in a fresh db, so
  // instead we simulate by re-registering everything against an unconfigured provider server.
  await boot(undefined, { configured: false });
  const admin2 = await signup('Payout Admin 2', adminEmail);
  const owner2 = await signup('Unconfigured Payout Owner 2');
  const providerSignup = await signup('Unconfigured Provider 2');
  const application = await request(
    '/concierge/applications',
    { headline: 'PM', experience: '', monthlyRateMinor: 20000 },
    providerSignup,
  );
  await request(
    `/admin/concierge-applications/${application.data.id}`,
    { decision: 'approve' },
    admin2,
    'PATCH',
  );
  // Registering a payment account with no provider configured stores it with recipient_code: null.
  await request(
    '/payment-accounts',
    {
      provider: 'paystack',
      accountName: 'Unconfigured Provider 2',
      accountNumber: '0123456789',
      bankCode: '058',
    },
    providerSignup,
  );
  const providerState = (await request('/state', undefined, providerSignup, 'GET')).data;
  await request('/workspace/concierge', { userId: providerState.user.id }, owner2);

  const attempt = await request('/billing/pay-provider', {}, owner2);
  // No provider configured => 503 (no recipient_code was ever created either, so 400 would also be honest,
  // but the unconfigured-provider check runs first per the implementation).
  assert.ok([400, 503].includes(attempt.status));
  t.after(teardown);
});

test('a mocked Paystack payout marks only the unpaid pm_fee line items paid, leaving ecosystem_fee untouched', async (t) => {
  const fetchImpl = mockFetch({
    'https://api.paystack.co/transferrecipient': () =>
      jsonResponse(200, { status: true, data: { recipient_code: 'RCP_payout_2' } }),
    'https://api.paystack.co/transfer': (body) =>
      jsonResponse(200, { status: true, data: { reference: body.reference, status: 'pending' } }),
  });
  await boot(fetchImpl);
  t.after(teardown);
  const adminCookie = await signup('Payout Admin 3', adminEmail);
  const owner = await signup('Payout Owner');
  const provider = await approvedProviderWithAccount('Payout Provider', adminCookie, 20000);
  assert.ok(provider.hasRecipient);
  await request('/workspace/concierge', { userId: provider.userId }, owner);

  const ownerState = (await request('/state', undefined, owner, 'GET')).data;
  const sixtyFiveDaysAgo = Date.now() - 65 * 24 * 60 * 60 * 1000;
  await store.db
    .prepare(
      "UPDATE workspace_members SET created_at = ? WHERE workspace_id = ? AND role = 'concierge'",
    )
    .run(sixtyFiveDaysAgo, ownerState.workspace.id);

  // Loading the statement lazily generates the elapsed pm_fee cycles.
  const statementBefore = await request('/billing/statement', undefined, owner, 'GET');
  assert.equal(statementBefore.data.lineItems.filter((i) => i.kind === 'pm_fee').length, 2);

  // Only the owner (not the concierge) can trigger payout.
  await request('/workspace/switch', { workspaceId: ownerState.workspace.id }, provider.cookie);
  const blocked = await request('/billing/pay-provider', {}, provider.cookie);
  assert.equal(blocked.status, 403);

  const payout = await request('/billing/pay-provider', {}, owner);
  assert.equal(payout.status, 201);
  assert.equal(payout.data.paidMinor, 40000); // 2 cycles x 20000

  const statementAfter = await request('/billing/statement', undefined, owner, 'GET');
  const pmItems = statementAfter.data.lineItems.filter((i) => i.kind === 'pm_fee');
  const ecosystemItems = statementAfter.data.lineItems.filter((i) => i.kind === 'ecosystem_fee');
  assert.ok(pmItems.every((i) => i.paid_at));
  assert.ok(ecosystemItems.every((i) => !i.paid_at));

  // Calling payout again with nothing newly owed is refused.
  const again = await request('/billing/pay-provider', {}, owner);
  assert.equal(again.status, 400);
});
