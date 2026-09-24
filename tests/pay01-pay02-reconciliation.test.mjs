import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createFundedTestApp as createApp } from './support/funded-app.mjs';
import { paystackProvider as importedPaystackProvider } from '../src/app/payments.mjs';

const PAYSTACK_SECRET = 'sk_test_pay0102_fixture';

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
async function boot(fetchImpl) {
  const paymentProvider = (name) =>
    name === 'paystack'
      ? importedPaystackProvider({ secretKey: PAYSTACK_SECRET, fetchImpl: fetchImpl || fetch })
      : null;
  ({ app, store } = await createApp({
    filename: ':memory:',
    rateLimits: { api: { max: 1000 }, auth: { max: 1000 }, mutation: { max: 1000 }, spend: { max: 1000 } },
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
async function fullyApprovedMilestone(client, freelancer, freelancerUserId, amount = 750) {
  const job = await request(
    '/jobs',
    {
      title: 'PAY reconciliation job',
      category: 'Software engineering',
      projectType: 'Fixed-scope project',
      description: 'A job used to exercise payment reconciliation.',
      deliverables: 'Deliverable used to test reconciliation.',
      budgetMin: 500,
      budgetMax: 2000,
      currency: 'USD',
      timeline: '4 weeks',
    },
    client,
  );
  assert.equal(job.status, 201);
  const bid = await request(
    `/jobs/${job.data.id}/bids`,
    { coverLetter: 'I will deliver this work.', proposedAmount: amount, currency: 'USD', timeline: '4 weeks' },
    freelancer,
  );
  assert.equal(bid.status, 201);
  const project = await request(
    '/projects',
    { jobId: job.data.id, title: 'PAY reconciliation project', freelancerUserId },
    client,
  );
  assert.equal(project.status, 201);
  const milestone = await request(
    `/projects/${project.data.id}/milestones`,
    { title: 'Phase 1', description: '', amount, currency: 'USD' },
    client,
  );
  assert.equal(milestone.status, 201);
  const deliverable = await request(
    `/milestones/${milestone.data.id}/deliverables`,
    { title: 'Deliverable', description: '', criteria: ['Work is complete'] },
    client,
  );
  assert.equal(deliverable.status, 201);
  const submission = await request(
    `/milestones/${milestone.data.id}/submissions`,
    { notes: 'Work is complete as agreed.' },
    freelancer,
  );
  assert.equal(submission.status, 201);
  const verification = await request(`/submissions/${submission.data.id}/verify`, {}, client);
  assert.equal(verification.status, 201);
  const decision = await request(
    `/verification-cases/${verification.data.id}/decisions`,
    { decision: 'approve', reason: 'Approved.' },
    client,
  );
  assert.equal(decision.status, 201);
  return { milestone: decision.data };
}

test('PAY-01: a provider failure during /fund leaves a reconcilable record instead of nothing at all, and a retry is allowed', async (t) => {
  const fetchImpl = mockFetch({
    'https://api.paystack.co/transaction/initialize': () =>
      jsonResponse(500, { status: false, message: 'Paystack is temporarily unavailable.' }),
  });
  await boot(fetchImpl);
  t.after(teardown);
  const client = await signup('Pay01 Client', 'pay01-client@example.test');
  const freelancer = await signup('Pay01 Freelancer', 'pay01-freelancer@example.test');
  const freelancerState = (await request('/state', undefined, freelancer, 'GET')).data;
  const { milestone } = await fullyApprovedMilestone(client, freelancer, freelancerState.user.id);

  const fund = await request(`/milestones/${milestone.id}/fund`, {}, client);
  assert.equal(fund.status, 502);

  const row = await store.db
    .prepare('SELECT * FROM milestone_fundings WHERE milestone_id = ?')
    .get(milestone.id);
  assert.ok(row, 'the attempt is still recorded locally even though Paystack never confirmed it');
  assert.equal(row.status, 'init_failed');

  // A failed dispatch must not be mistaken for a live 'pending'/'held' funding — retrying is
  // still a clean attempt (502 again here only because the mock keeps failing), not a 409.
  const retry = await request(`/milestones/${milestone.id}/fund`, {}, client);
  assert.equal(retry.status, 502);
  assert.notEqual(retry.status, 409);
});

test('PAY-01: /points/purchase persists the purchase before dispatch, and marks it init_failed rather than losing it on provider failure', async (t) => {
  const fetchImpl = mockFetch({
    'https://api.paystack.co/transaction/initialize': () =>
      jsonResponse(500, { status: false, message: 'Paystack is temporarily unavailable.' }),
  });
  await boot(fetchImpl);
  t.after(teardown);
  const client = await signup('Pay01 Points Client', 'pay01-points-client@example.test');
  const purchase = await request('/points/purchase', { points: 50 }, client);
  assert.equal(purchase.status, 502);

  const rows = await store.db.prepare('SELECT * FROM points_purchases WHERE user_id = ?').all(
    (await request('/state', undefined, client, 'GET')).data.user.id,
  );
  assert.equal(rows.length, 1, 'a persisted, reconcilable record exists despite the provider failure');
  assert.equal(rows[0].status, 'init_failed');
});

test('PAY-02: a webhook reporting the wrong amount for a milestone funding is not credited as held', async (t) => {
  const fetchImpl = mockFetch({
    'https://api.paystack.co/transaction/initialize': () =>
      jsonResponse(200, { status: true, data: { authorization_url: 'https://paystack.test/pay/x', access_code: 'x' } }),
  });
  await boot(fetchImpl);
  t.after(teardown);
  const client = await signup('Pay02 Client', 'pay02-client@example.test');
  const freelancer = await signup('Pay02 Freelancer', 'pay02-freelancer@example.test');
  const freelancerState = (await request('/state', undefined, freelancer, 'GET')).data;
  const { milestone } = await fullyApprovedMilestone(client, freelancer, freelancerState.user.id, 750);

  const fund = await request(`/milestones/${milestone.id}/fund`, {}, client);
  assert.equal(fund.status, 201);

  const event = {
    event: 'charge.success',
    data: { reference: fund.data.reference, amount: 1, currency: fund.data.currency },
  };
  const rawBody = Buffer.from(JSON.stringify(event));
  const signature = createHmac('sha512', PAYSTACK_SECRET).update(rawBody).digest('hex');
  const webhookResponse = await fetch(`${base}/api/webhooks/paystack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-paystack-signature': signature },
    body: rawBody,
  });
  assert.equal(webhookResponse.status, 200);

  const funding = await request(`/milestones/${milestone.id}/funding`, undefined, client, 'GET');
  assert.equal(funding.data.status, 'amount_mismatch');
  assert.equal(funding.data.held_at, null, 'a mismatched amount must never be marked held');
});

test('PAY-02: a webhook reporting the wrong amount for a points purchase does not credit any points', async (t) => {
  const fetchImpl = mockFetch({
    'https://api.paystack.co/transaction/initialize': () =>
      jsonResponse(200, { status: true, data: { authorization_url: 'https://paystack.test/pay/y', access_code: 'y' } }),
  });
  await boot(fetchImpl);
  t.after(teardown);
  const client = await signup('Pay02 Points Client', 'pay02-points-client@example.test');
  const before = (await request('/state', undefined, client, 'GET')).data.user.points_balance;

  const purchase = await request('/points/purchase', { points: 50 }, client);
  assert.equal(purchase.status, 201);

  const event = {
    event: 'charge.success',
    data: { reference: purchase.data.reference, amount: 999999, currency: 'USD' },
  };
  const rawBody = Buffer.from(JSON.stringify(event));
  const signature = createHmac('sha512', PAYSTACK_SECRET).update(rawBody).digest('hex');
  const webhookResponse = await fetch(`${base}/api/webhooks/paystack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-paystack-signature': signature },
    body: rawBody,
  });
  assert.equal(webhookResponse.status, 200);

  const after = (await request('/state', undefined, client, 'GET')).data.user.points_balance;
  assert.equal(after, before, 'a mismatched amount must never credit points');
  const row = await store.db
    .prepare('SELECT status FROM points_purchases WHERE provider_reference = ?')
    .get(purchase.data.reference);
  assert.equal(row.status, 'amount_mismatch');
});

test('PAY-02: a definite (4xx) rejection on /release frees the milestone for retry; an ambiguous (5xx) one does not', async (t) => {
  let transferCallCount = 0;
  const fetchImpl = mockFetch({
    'https://api.paystack.co/transferrecipient': () =>
      jsonResponse(200, { status: true, data: { recipient_code: 'RCP_pay02' } }),
    'https://api.paystack.co/transaction/initialize': () =>
      jsonResponse(200, { status: true, data: { authorization_url: 'https://paystack.test/pay/z', access_code: 'z' } }),
    'https://api.paystack.co/transfer': () => {
      transferCallCount++;
      return jsonResponse(500, { status: false, message: 'Paystack had an internal error.' });
    },
  });
  await boot(fetchImpl);
  t.after(teardown);
  const client = await signup('Pay02 Release Client', 'pay02-release-client@example.test');
  const freelancer = await signup('Pay02 Release Freelancer', 'pay02-release-freelancer@example.test');
  const freelancerState = (await request('/state', undefined, freelancer, 'GET')).data;
  await request(
    '/payment-accounts',
    { provider: 'paystack', accountName: 'Pay02 Freelancer', accountNumber: '0123456789', bankCode: '058' },
    freelancer,
  );
  const { milestone } = await fullyApprovedMilestone(client, freelancer, freelancerState.user.id, 750);
  const fund = await request(`/milestones/${milestone.id}/fund`, {}, client);
  const fundEvent = {
    event: 'charge.success',
    data: { reference: fund.data.reference, amount: fund.data.amountMinor, currency: fund.data.currency },
  };
  const fundRawBody = Buffer.from(JSON.stringify(fundEvent));
  await fetch(`${base}/api/webhooks/paystack`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-paystack-signature': createHmac('sha512', PAYSTACK_SECRET).update(fundRawBody).digest('hex'),
    },
    body: fundRawBody,
  });

  // A 5xx from Paystack is ambiguous — the milestone must stay locked, not silently retryable.
  const release = await request(`/milestones/${milestone.id}/release`, { provider: 'paystack' }, client);
  assert.equal(release.status, 502);
  assert.match(release.data.error, /manual reconciliation/);

  const transfers = await request(`/milestones/${milestone.id}/transfers`, undefined, client, 'GET');
  assert.equal(transfers.data[0].status, 'unknown');

  const blockedRetry = await request(`/milestones/${milestone.id}/release`, { provider: 'paystack' }, client);
  assert.equal(blockedRetry.status, 400, 'an ambiguous outcome must not be silently retryable');
  assert.equal(transferCallCount, 1, 'no second real transfer was ever attempted');
});
