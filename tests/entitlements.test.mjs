import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createFundedTestApp as createApp } from './support/funded-app.mjs';
import { paystackProvider as importedPaystackProvider } from '../src/app/payments.mjs';

const PAYSTACK_SECRET = 'sk_test_entitlements_fixture';
const adminEmail = 'entitlements-admin@lamidgrowth.test';

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
before(async () => {
  const fetchImpl = mockFetch({
    'https://api.paystack.co/transaction/initialize': (body) =>
      jsonResponse(200, { status: true, data: { authorization_url: 'https://paystack.test/pay/mock', access_code: 'mock' } }),
  });
  ({ app, store } = await createApp({
    filename: ':memory:',
    rateLimits: { api: { max: 1000 }, auth: { max: 1000 }, mutation: { max: 1000 }, spend: { max: 1000 } },
    ecosystemAdminEmails: [adminEmail],
    paymentProvider: (name) => (name === 'paystack' ? importedPaystackProvider({ secretKey: PAYSTACK_SECRET, fetchImpl }) : null),
    // A stub aiProvider so the one AI-backed chat agent this file exercises (opportunity-signals)
    // can complete rather than 503 for lack of a configured provider — same pattern as agents.test.mjs.
    aiProvider: {
      name: 'test',
      model: 'test',
      async review(context) {
        return {
          review: { summary: `stub review: ${context.question}`, assumptions: [], suggestions: [], evidenceIds: [] },
        };
      },
    },
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
  return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
}

let counter = 0;
async function signup(name, email) {
  counter++;
  const result = await request('/auth/signup', {
    name,
    email: email || `entitlements-${counter}-${Date.now()}@example.test`,
    password: `a-long-entitlements-password-${counter}`,
    context: 'Founder',
  });
  assert.equal(result.status, 201);
  return result.cookie;
}

/** funded-app.mjs enterprise-tiers every new signup so existing behavior tests aren't tripped by
 * this gate. Downgrading back to 'individual' here is what actually exercises it. */
async function downgradeToIndividual(cookie) {
  const state = await request('/state', undefined, cookie, 'GET');
  await store.db.prepare("UPDATE workspaces SET tier = 'individual' WHERE id = ?").run(state.data.workspace.id);
  return state.data;
}

async function fireWebhook(reference) {
  const event = { event: 'charge.success', data: { reference } };
  const rawBody = Buffer.from(JSON.stringify(event));
  const signature = createHmac('sha512', PAYSTACK_SECRET).update(rawBody).digest('hex');
  const response = await fetch(`${base}/api/webhooks/paystack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-paystack-signature': signature },
    body: rawBody,
  });
  assert.equal(response.status, 200);
}

test('an individual-tier workspace with no bundle cannot run a paid engine or a paid chat agent, and is not charged', async () => {
  const cookie = await signup('Blocked Individual');
  const { user } = await downgradeToIndividual(cookie);
  const before = user.points_balance ?? (await request('/finance/points', undefined, cookie, 'GET')).data.balance;

  const engineRun = await request('/engines/f01/run', { input: {} }, cookie);
  assert.equal(engineRun.status, 403);
  assert.match(engineRun.data.error, /not included in your plan|isn't included/);

  const agentRun = await request('/companion/messages', { message: 'surface opportunities', agentId: 'opportunity-signals' }, cookie);
  assert.equal(agentRun.status, 403);

  const balance = await request('/finance/points', undefined, cookie, 'GET');
  assert.equal(balance.data.balance, before);
});

test('the free chat agents remain accessible to an individual-tier workspace with no bundle', async () => {
  const cookie = await signup('Free Tools Individual');
  await downgradeToIndividual(cookie);
  const result = await request('/companion/messages', { message: 'help me get started', agentId: 'onboarding' }, cookie);
  assert.equal(result.status, 201);
  assert.equal(result.data.pointsCharged, 0);
});

test('purchasing a bundle grants real access to exactly the tools it includes, confirmed only after the webhook fires', async () => {
  const adminCookie = await signup('Entitlements Admin', adminEmail);
  // The admin's own workspace is irrelevant here — bundles are a platform-wide catalog created by
  // ecosystemAdminEmails, matching tests/pricing.test.mjs's existing admin-bundle pattern.
  const buyerCookie = await signup('Bundle Buyer');
  const { workspace } = await downgradeToIndividual(buyerCookie);

  const create = await request(
    '/admin/bundles',
    { name: 'Finance Starter', priceMinor: 5000, pointsIncluded: 100, agentIds: ['f01', 'opportunity-signals'] },
    adminCookie,
  );
  assert.equal(create.status, 201);
  const bundleId = create.data.id;
  const publish = await request(`/admin/bundles/${bundleId}`, { status: 'active' }, adminCookie, 'PATCH');
  assert.equal(publish.status, 200);

  // Blocked before purchase.
  assert.equal((await request('/engines/f01/run', { input: {} }, buyerCookie)).status, 403);

  const purchase = await request('/points/purchase', { bundleId }, buyerCookie);
  assert.equal(purchase.status, 201);

  // Still blocked between initiation and webhook confirmation — a pending purchase grants nothing.
  assert.equal((await request('/engines/f01/run', { input: {} }, buyerCookie)).status, 403);

  await fireWebhook(purchase.data.reference);

  const engineRun = await request(
    '/engines/f01/run',
    { input: { currency: 'USD', periodLabel: 'Month', periods: [{ revenue: 1000, cogs: 400, opex: 300 }], cashBalance: 1000, headcount: 1 } },
    buyerCookie,
  );
  assert.equal(engineRun.status, 200);
  assert.equal(engineRun.data.pointsCharged, 35);

  // opportunity-signals calls external AI, which separately requires a verified account (an
  // unrelated pre-existing gate in aiPolicy.mjs, also a 403) — a fresh test signup isn't
  // verified, so this only asserts the entitlement gate specifically was cleared (a different
  // error message), not a full successful run. The DB check below is the precise assertion for
  // what this test actually covers.
  const agentRun = await request('/companion/messages', { message: 'surface opportunities', agentId: 'opportunity-signals', consent: true }, buyerCookie);
  assert.doesNotMatch(agentRun.data.error, /isn't included in your plan/);

  // A different paid tool NOT in the bundle stays blocked — the grant is scoped to bundle_items,
  // not a blanket unlock.
  const other = await request('/engines/s01/run', { input: { rows: [{ label: 'Identity Clarity', rating: 3 }] } }, buyerCookie);
  assert.equal(other.status, 403);

  const row = await store.db
    .prepare('SELECT * FROM workspace_agent_entitlements WHERE workspace_id = ? ORDER BY agent_id').all(workspace.id);
  assert.deepEqual(row.map((r) => r.agent_id).sort(), ['f01', 'opportunity-signals']);
});

test('an enterprise-tier workspace can run any paid tool without any bundle', async () => {
  const cookie = await signup('Enterprise Default'); // funded-app.mjs already enterprise-tiers new signups
  const engineRun = await request('/engines/s01/run', { input: { rows: [{ label: 'Identity Clarity', rating: 4 }] } }, cookie);
  assert.equal(engineRun.status, 200);
});
