import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createApp } from '../src/app/app.mjs';
import { paystackProvider } from '../src/app/payments.mjs';

const PAYSTACK_SECRET = 'sk_test_escrow_fixture';

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

async function approvedMilestone(client, freelancer, amount = 750) {
  const job = await request(
    '/jobs',
    {
      title: 'Escrow lifecycle job',
      category: 'Software engineering',
      projectType: 'Fixed-scope project',
      description: 'A job used to exercise escrow funding and release.',
      deliverables: 'A working deliverable.',
      budgetMin: 500,
      budgetMax: 2000,
      currency: 'USD',
      timeline: '2 weeks',
    },
    client,
  );
  const bid = await request(
    `/jobs/${job.data.id}/bids`,
    { coverLetter: 'I will deliver this work as agreed.', proposedAmount: amount, currency: 'USD', timeline: '2 weeks' },
    freelancer,
  );
  void bid;
  const project = await request(
    '/projects',
    { jobId: job.data.id, title: 'Escrow project', freelancerUserId: (await request('/state', undefined, freelancer, 'GET')).data.user.id },
    client,
  );
  const milestone = await request(
    `/projects/${project.data.id}/milestones`,
    { title: 'Phase 1', description: '', amount, currency: 'USD' },
    client,
  );
  await request(`/milestones/${milestone.data.id}/deliverables`, { title: 'D', description: '', criteria: ['Work is complete'] }, client);
  const submission = await request(`/milestones/${milestone.data.id}/submissions`, { notes: 'Work is complete as agreed.' }, freelancer);
  const verification = await request(`/submissions/${submission.data.id}/verify`, {}, client);
  await request(`/verification-cases/${verification.data.id}/decisions`, { decision: 'approve', reason: 'Approved.' }, client);
  return { milestoneId: milestone.data.id, project: project.data };
}

test('with no provider configured, funding is refused rather than faked', async (t) => {
  await boot(undefined, { configured: false });
  t.after(teardown);
  const client = await signup('NoProvider Client', 'noprovider-escrow-client@example.test');
  const freelancer = await signup('NoProvider Freelancer', 'noprovider-escrow-freelancer@example.test');
  const { milestoneId } = await approvedMilestone(client, freelancer);
  const fund = await request(`/milestones/${milestoneId}/fund`, {}, client);
  assert.equal(fund.status, 503);
  const funding = await request(`/milestones/${milestoneId}/funding`, undefined, client, 'GET');
  assert.equal(funding.data, null);
});

test('release is refused before a milestone is funded, even once approved', async (t) => {
  const fetchImpl = mockFetch({});
  await boot(fetchImpl);
  t.after(teardown);
  const client = await signup('Unfunded Client', 'unfunded-client@example.test');
  const freelancer = await signup('Unfunded Freelancer', 'unfunded-freelancer@example.test');
  const { milestoneId } = await approvedMilestone(client, freelancer);
  const release = await request(`/milestones/${milestoneId}/release`, { provider: 'paystack' }, client);
  assert.equal(release.status, 400);
  assert.ok(release.data.error.includes('no funds held in escrow'));
});

test('a mocked fund -> webhook hold -> release lifecycle marks funding released only after real confirmation', async (t) => {
  const fetchImpl = mockFetch({
    'https://api.paystack.co/transaction/initialize': (body) =>
      jsonResponse(200, { status: true, data: { authorization_url: 'https://paystack.test/pay/xyz', access_code: 'xyz' } }),
    'https://api.paystack.co/transferrecipient': () =>
      jsonResponse(200, { status: true, data: { recipient_code: 'RCP_escrow_1' } }),
    'https://api.paystack.co/transfer': (body) =>
      jsonResponse(200, { status: true, data: { reference: body.reference, status: 'pending' } }),
  });
  await boot(fetchImpl);
  t.after(teardown);
  const client = await signup('Escrow Client', 'escrow-client@example.test');
  const freelancer = await signup('Escrow Freelancer', 'escrow-freelancer@example.test');
  await request(
    '/payment-accounts',
    { provider: 'paystack', accountName: 'Escrow Freelancer', accountNumber: '0123456789', bankCode: '058' },
    freelancer,
  );
  const { milestoneId } = await approvedMilestone(client, freelancer, 750);

  // Only the client can fund.
  const blockedFund = await request(`/milestones/${milestoneId}/fund`, {}, freelancer);
  assert.equal(blockedFund.status, 403);

  const fund = await request(`/milestones/${milestoneId}/fund`, {}, client);
  assert.equal(fund.status, 201);
  assert.equal(fund.data.amountMinor, 75000);

  const beforeWebhook = await request(`/milestones/${milestoneId}/funding`, undefined, client, 'GET');
  assert.equal(beforeWebhook.data.status, 'pending');

  // Release attempted before the hold is confirmed still fails.
  const tooEarlyRelease = await request(`/milestones/${milestoneId}/release`, { provider: 'paystack' }, client);
  assert.equal(tooEarlyRelease.status, 400);

  // A second fund attempt while one is pending is rejected.
  const duplicateFund = await request(`/milestones/${milestoneId}/fund`, {}, client);
  assert.equal(duplicateFund.status, 409);

  const event = { event: 'charge.success', data: { reference: fund.data.reference } };
  const rawBody = Buffer.from(JSON.stringify(event));
  const signature = createHmac('sha512', PAYSTACK_SECRET).update(rawBody).digest('hex');
  const webhookResponse = await fetch(`${base}/api/webhooks/paystack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-paystack-signature': signature },
    body: rawBody,
  });
  assert.equal(webhookResponse.status, 200);

  const afterWebhook = await request(`/milestones/${milestoneId}/funding`, undefined, freelancer, 'GET');
  assert.equal(afterWebhook.data.status, 'held');
  assert.ok(afterWebhook.data.held_at);

  // Only the client can release.
  const blockedRelease = await request(`/milestones/${milestoneId}/release`, { provider: 'paystack' }, freelancer);
  assert.equal(blockedRelease.status, 403);

  const release = await request(`/milestones/${milestoneId}/release`, { provider: 'paystack' }, client);
  assert.equal(release.status, 201);
  assert.equal(release.data.status, 'processing');

  // Funding is still "held" (not yet "released") until Paystack confirms the transfer succeeded —
  // no optimistic "released" before real confirmation.
  const afterReleaseCall = await request(`/milestones/${milestoneId}/funding`, undefined, client, 'GET');
  assert.equal(afterReleaseCall.data.status, 'held');

  const transferEvent = { event: 'transfer.success', data: { reference: release.data.provider_reference } };
  const transferRawBody = Buffer.from(JSON.stringify(transferEvent));
  const transferSignature = createHmac('sha512', PAYSTACK_SECRET).update(transferRawBody).digest('hex');
  await fetch(`${base}/api/webhooks/paystack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-paystack-signature': transferSignature },
    body: transferRawBody,
  });

  const finalFunding = await request(`/milestones/${milestoneId}/funding`, undefined, client, 'GET');
  assert.equal(finalFunding.data.status, 'released');
  assert.ok(finalFunding.data.released_at);
});
