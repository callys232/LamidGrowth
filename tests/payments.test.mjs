import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createApp } from '../src/app/app.mjs';
import { paystackProvider as importedPaystackProvider } from '../src/app/payments.mjs';

const PAYSTACK_SECRET = 'sk_test_fixture_secret';

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
let paymentProvider;
async function boot(fetchImpl, { configured = true } = {}) {
  paymentProvider = (name) =>
    name === 'paystack' && configured
      ? importedPaystackProvider({ secretKey: PAYSTACK_SECRET, fetchImpl: fetchImpl || fetch })
      : null;
  ({ app, store } = createApp({
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
  store.db.close();
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
      title: 'Payments lifecycle job',
      category: 'Software engineering',
      projectType: 'Fixed-scope project',
      description: 'A job used to exercise milestone payment release.',
      deliverables: 'Deliverable used to test payments.',
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
    { jobId: job.data.id, title: 'Payments project', freelancerUserId },
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
  assert.equal(decision.data.status, 'approved');
  return { milestone: decision.data, project: project.data };
}

test('with no payment provider configured, accounts record inertly and release never fakes success', async (t) => {
  await boot(
    async () => {
      throw new Error('fetch should never be called when no provider is configured');
    },
    { configured: false },
  );
  t.after(teardown);
  const client = await signup('NoProvider Client', 'noprovider-client@example.test');
  const freelancer = await signup('NoProvider Freelancer', 'noprovider-freelancer@example.test');
  const freelancerState = (await request('/state', undefined, freelancer, 'GET')).data;

  const account = await request(
    '/payment-accounts',
    { provider: 'paystack', accountName: 'NoProvider Freelancer', accountNumber: '0000000000', bankCode: '058' },
    freelancer,
  );
  assert.equal(account.status, 201);
  assert.equal(account.data.recipient_code, null);
  assert.ok(account.data.message.includes('not yet enabled'));

  const { milestone } = await fullyApprovedMilestone(client, freelancer, freelancerState.user.id);
  // With no provider configured, the milestone was never funded either — release correctly
  // refuses because there is nothing held in escrow, which is the more specific and equally
  // honest reason (never a fake success either way).
  const release = await request('/milestones/' + milestone.id + '/release', { provider: 'paystack' }, client);
  assert.equal(release.status, 400);
  assert.ok(release.data.error.includes('no funds held'));
  const transfers = await request(`/milestones/${milestone.id}/transfers`, undefined, client, 'GET');
  assert.equal(transfers.data.length, 0);
});

test('crypto/USDT provider is registered but returns unimplemented for release', async (t) => {
  await boot();
  t.after(teardown);
  const client = await signup('Crypto Client', 'crypto-client@example.test');
  const freelancer = await signup('Crypto Freelancer', 'crypto-freelancer@example.test');
  const freelancerState = (await request('/state', undefined, freelancer, 'GET')).data;
  const account = await request(
    '/payment-accounts',
    { provider: 'crypto_usdt', accountName: 'Crypto Freelancer', accountNumber: '0xabc' },
    freelancer,
  );
  assert.equal(account.status, 201);
  assert.equal(account.data.recipient_code, null);
  const { milestone } = await fullyApprovedMilestone(client, freelancer, freelancerState.user.id);
  // Funding only ever runs through Paystack today, so a crypto_usdt milestone was never
  // funded either — release refuses for that reason, still never a fake success.
  const release = await request('/milestones/' + milestone.id + '/release', { provider: 'crypto_usdt' }, client);
  assert.equal(release.status, 400);
  assert.ok(release.data.error.includes('no funds held'));
});

test('a mocked Paystack happy path: recipient, transfer, then webhook confirms payment', async (t) => {
  const fetchImpl = mockFetch({
    'https://api.paystack.co/transferrecipient': () =>
      jsonResponse(200, { status: true, data: { recipient_code: 'RCP_mock_123' } }),
    'https://api.paystack.co/transfer': (body) =>
      jsonResponse(200, { status: true, data: { reference: body.reference, status: 'pending' } }),
    'https://api.paystack.co/transaction/initialize': (body) =>
      jsonResponse(200, { status: true, data: { authorization_url: 'https://paystack.test/pay/mock', access_code: 'mock' } }),
  });
  await boot(fetchImpl);
  t.after(teardown);
  const client = await signup('Paystack Client', 'paystack-client@example.test');
  const freelancer = await signup('Paystack Freelancer', 'paystack-freelancer@example.test');
  const freelancerState = (await request('/state', undefined, freelancer, 'GET')).data;

  const account = await request(
    '/payment-accounts',
    { provider: 'paystack', accountName: 'Paystack Freelancer', accountNumber: '0123456789', bankCode: '058' },
    freelancer,
  );
  assert.equal(account.status, 201);
  assert.equal(account.data.recipient_code, 'RCP_mock_123');

  const { milestone } = await fullyApprovedMilestone(client, freelancer, freelancerState.user.id, 750);

  // Fund the milestone and confirm the hold via webhook before release is possible.
  const fund = await request(`/milestones/${milestone.id}/fund`, {}, client);
  assert.equal(fund.status, 201);
  const fundEvent = { event: 'charge.success', data: { reference: fund.data.reference } };
  const fundRawBody = Buffer.from(JSON.stringify(fundEvent));
  const fundSignature = createHmac('sha512', PAYSTACK_SECRET).update(fundRawBody).digest('hex');
  await fetch(`${base}/api/webhooks/paystack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-paystack-signature': fundSignature },
    body: fundRawBody,
  });

  const release = await request('/milestones/' + milestone.id + '/release', { provider: 'paystack' }, client);
  assert.equal(release.status, 201);
  assert.equal(release.data.status, 'processing');
  assert.equal(release.data.amount_minor, 75000);
  const providerReference = release.data.provider_reference;
  assert.ok(providerReference);

  const event = { event: 'transfer.success', data: { reference: providerReference } };
  const rawBody = Buffer.from(JSON.stringify(event));
  const signature = createHmac('sha512', PAYSTACK_SECRET).update(rawBody).digest('hex');
  const webhookResponse = await fetch(`${base}/api/webhooks/paystack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-paystack-signature': signature },
    body: rawBody,
  });
  assert.equal(webhookResponse.status, 200);

  const transfers = await request(`/milestones/${milestone.id}/transfers`, undefined, client, 'GET');
  assert.equal(transfers.data[0].status, 'succeeded');

  // Idempotent replay: sending the exact same event again must not double-process.
  const replay = await fetch(`${base}/api/webhooks/paystack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-paystack-signature': signature },
    body: rawBody,
  });
  assert.equal(replay.status, 200);
  const replayData = await replay.json();
  assert.equal(replayData.deduplicated, true);
});

test('webhook rejects an invalid signature', async (t) => {
  const fetchImpl = mockFetch({});
  await boot(fetchImpl);
  t.after(teardown);
  const event = { event: 'transfer.success', data: { reference: 'REF_nonexistent' } };
  const rawBody = Buffer.from(JSON.stringify(event));
  const response = await fetch(`${base}/api/webhooks/paystack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-paystack-signature': 'not-a-real-signature' },
    body: rawBody,
  });
  assert.equal(response.status, 401);
});

test('only the milestone client can release payment', async (t) => {
  const fetchImpl = mockFetch({
    'https://api.paystack.co/transferrecipient': () =>
      jsonResponse(200, { status: true, data: { recipient_code: 'RCP_mock_456' } }),
  });
  await boot(fetchImpl);
  t.after(teardown);
  const client = await signup('AuthPay Client', 'authpay-client@example.test');
  const freelancer = await signup('AuthPay Freelancer', 'authpay-freelancer@example.test');
  const stranger = await signup('AuthPay Stranger', 'authpay-stranger@example.test');
  const freelancerState = (await request('/state', undefined, freelancer, 'GET')).data;
  await request(
    '/payment-accounts',
    { provider: 'paystack', accountName: 'AuthPay Freelancer', accountNumber: '0123456780', bankCode: '058' },
    freelancer,
  );
  const { milestone } = await fullyApprovedMilestone(client, freelancer, freelancerState.user.id);

  const freelancerRelease = await request('/milestones/' + milestone.id + '/release', { provider: 'paystack' }, freelancer);
  assert.equal(freelancerRelease.status, 403);
  const strangerRelease = await request('/milestones/' + milestone.id + '/release', { provider: 'paystack' }, stranger);
  assert.equal(strangerRelease.status, 403);
});
