import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createFundedTestApp as createApp } from './support/funded-app.mjs';
import { paystackProvider } from '../src/app/payments.mjs';

const PAYSTACK_SECRET = 'sk_test_points_fixture';

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
async function signup(name, email) {
  const result = await request('/auth/signup', {
    name,
    email,
    password: `a-long-${name.toLowerCase()}-password`,
    context: 'Founder',
  });
  assert.equal(result.status, 201);
  return result.cookie;
}

test('with no provider configured, purchase is refused rather than faked', async (t) => {
  await boot(undefined, { configured: false });
  t.after(teardown);
  const client = await signup('NoProvider Client', 'noprovider-points@example.test');
  const purchase = await request('/points/purchase', { points: 100 }, client);
  assert.equal(purchase.status, 503);
});

test('a mocked Paystack checkout, confirmed by webhook, credits exactly the right points once', async (t) => {
  const fetchImpl = mockFetch({
    'https://api.paystack.co/transaction/initialize': (body) =>
      jsonResponse(200, {
        status: true,
        data: { authorization_url: 'https://paystack.test/pay/abc', access_code: 'abc' },
      }),
  });
  await boot(fetchImpl);
  t.after(teardown);
  const client = await signup('Points Client', 'points-client@example.test');
  const before = (await request('/state', undefined, client, 'GET')).data.user;
  void before;

  const purchase = await request('/points/purchase', { points: 50 }, client);
  assert.equal(purchase.status, 201);
  assert.equal(purchase.data.amountMinor, 500); // 50 points * 10 minor units/point
  assert.ok(purchase.data.authorizationUrl.startsWith('https://paystack.test'));

  // PAY-02: the webhook now validates the reported amount/currency against what was actually
  // dispatched to Paystack, which can differ from the canonical purchase amount after FX
  // conversion (see payments.mjs) — read the dispatched figures back rather than guess them.
  const dispatched = await store.db
    .prepare(
      'SELECT provider_amount_minor, provider_currency FROM points_purchases WHERE provider_reference = ?',
    )
    .get(purchase.data.reference);
  const event = {
    event: 'charge.success',
    data: {
      reference: purchase.data.reference,
      amount: dispatched.provider_amount_minor,
      currency: dispatched.provider_currency,
    },
  };
  const rawBody = Buffer.from(JSON.stringify(event));
  const signature = createHmac('sha512', PAYSTACK_SECRET).update(rawBody).digest('hex');
  const webhookResponse = await fetch(`${base}/api/webhooks/paystack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-paystack-signature': signature },
    body: rawBody,
  });
  assert.equal(webhookResponse.status, 200);

  const purchases = await request('/points/purchases', undefined, client, 'GET');
  assert.equal(purchases.data[0].status, 'completed');
  const balanceRow = await store.db
    .prepare('SELECT points_balance FROM users WHERE email = ?')
    .get('points-client@example.test');
  assert.equal(balanceRow.points_balance, 100050); // 100000 test-fixture grant + 50 purchased

  // Replaying the identical webhook event does not double-credit.
  const replay = await fetch(`${base}/api/webhooks/paystack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-paystack-signature': signature },
    body: rawBody,
  });
  assert.equal(replay.status, 200);
  const replayData = await replay.json();
  assert.equal(replayData.deduplicated, true);
});
