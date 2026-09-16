import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createFundedTestApp as createApp } from './support/funded-app.mjs';
import { paystackProvider } from '../src/app/payments.mjs';

const PAYSTACK_SECRET = 'sk_test_refund_fixture';

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
    name === 'paystack' ? paystackProvider({ secretKey: PAYSTACK_SECRET, fetchImpl: fetchImpl || fetch }) : null;
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

async function fundedAndDisputedMilestone(client, freelancer, base) {
  const job = await request(
    '/jobs',
    {
      title: 'Refund lifecycle job',
      category: 'Software engineering',
      projectType: 'Fixed-scope project',
      description: 'A job used to exercise the escrow refund path end to end.',
      deliverables: 'A working deliverable.',
      budgetMin: 500,
      budgetMax: 2000,
      currency: 'USD',
      timeline: '2 weeks',
    },
    client,
  );
  await request(
    `/jobs/${job.data.id}/bids`,
    { coverLetter: 'I will deliver this work as agreed.', proposedAmount: 750, currency: 'USD', timeline: '2 weeks' },
    freelancer,
  );
  const freelancerState = (await request('/state', undefined, freelancer, 'GET')).data;
  const project = await request(
    '/projects',
    { jobId: job.data.id, title: 'Refund project', freelancerUserId: freelancerState.user.id },
    client,
  );
  const milestone = await request(
    `/projects/${project.data.id}/milestones`,
    { title: 'Phase 1', description: '', amount: 750, currency: 'USD' },
    client,
  );
  const submission = await request(`/milestones/${milestone.data.id}/submissions`, { notes: 'Completely unrelated work.' }, freelancer);
  const verification = await request(`/submissions/${submission.data.id}/verify`, {}, client);

  // Fund and confirm the hold before disputing.
  const fund = await request(`/milestones/${milestone.data.id}/fund`, {}, client);
  assert.equal(fund.status, 201);
  const fundEvent = { event: 'charge.success', data: { reference: fund.data.reference } };
  const fundRawBody = Buffer.from(JSON.stringify(fundEvent));
  const fundSignature = createHmac('sha512', PAYSTACK_SECRET).update(fundRawBody).digest('hex');
  await fetch(`${base}/api/webhooks/paystack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-paystack-signature': fundSignature },
    body: fundRawBody,
  });

  await request(
    `/verification-cases/${verification.data.id}/decisions`,
    { decision: 'dispute', reason: 'This does not match what was agreed.' },
    client,
  );
  return milestone.data.id;
}

test('a refund is refused before a dispute exists, even with held funds', async (t) => {
  const fetchImpl = mockFetch({
    'https://api.paystack.co/transaction/initialize': () =>
      jsonResponse(200, { status: true, data: { authorization_url: 'https://paystack.test/pay/abc', access_code: 'abc' } }),
  });
  await boot(fetchImpl);
  t.after(teardown);
  const client = await signup('NoDispute Client', 'nodispute-client@example.test');
  const freelancer = await signup('NoDispute Freelancer', 'nodispute-freelancer@example.test');
  const job = await request(
    '/jobs',
    {
      title: 'No dispute job',
      category: 'Software engineering',
      projectType: 'Fixed-scope project',
      description: 'A job used to check refund is refused before a dispute.',
      deliverables: 'Something.',
      budgetMin: 100,
      budgetMax: 1000,
      currency: 'USD',
      timeline: '1 week',
    },
    client,
  );
  await request(`/jobs/${job.data.id}/bids`, { coverLetter: 'A bid for this job that is long enough.', proposedAmount: 500, currency: 'USD', timeline: '1 week' }, freelancer);
  const freelancerState = (await request('/state', undefined, freelancer, 'GET')).data;
  const project = await request('/projects', { jobId: job.data.id, title: 'No dispute project', freelancerUserId: freelancerState.user.id }, client);
  const milestone = await request(`/projects/${project.data.id}/milestones`, { title: 'Phase 1', description: '', amount: 500, currency: 'USD' }, client);
  await request(`/milestones/${milestone.data.id}/fund`, {}, client);

  const refund = await request(`/milestones/${milestone.data.id}/refund`, {}, client);
  assert.equal(refund.status, 400);
  assert.ok(refund.data.error.includes('disputed milestone'));
});

test('a refund is refused with no held funding, even once disputed', async (t) => {
  await boot(mockFetch({}));
  t.after(teardown);
  const client = await signup('Unfunded Dispute Client', 'unfunded-dispute-client@example.test');
  const freelancer = await signup('Unfunded Dispute Freelancer', 'unfunded-dispute-freelancer@example.test');
  const job = await request(
    '/jobs',
    {
      title: 'Unfunded dispute job',
      category: 'Software engineering',
      projectType: 'Fixed-scope project',
      description: 'A job used to check refund is refused without a held funding.',
      deliverables: 'Something.',
      budgetMin: 100,
      budgetMax: 1000,
      currency: 'USD',
      timeline: '1 week',
    },
    client,
  );
  await request(`/jobs/${job.data.id}/bids`, { coverLetter: 'A bid for this job that is long enough.', proposedAmount: 500, currency: 'USD', timeline: '1 week' }, freelancer);
  const freelancerState = (await request('/state', undefined, freelancer, 'GET')).data;
  const project = await request('/projects', { jobId: job.data.id, title: 'Unfunded project', freelancerUserId: freelancerState.user.id }, client);
  const milestone = await request(`/projects/${project.data.id}/milestones`, { title: 'Phase 1', description: '', amount: 500, currency: 'USD' }, client);
  const submission = await request(`/milestones/${milestone.data.id}/submissions`, { notes: 'Unrelated work.' }, freelancer);
  const verification = await request(`/submissions/${submission.data.id}/verify`, {}, client);
  await request(`/verification-cases/${verification.data.id}/decisions`, { decision: 'dispute', reason: 'Not what was agreed.' }, client);

  const refund = await request(`/milestones/${milestone.data.id}/refund`, {}, client);
  assert.equal(refund.status, 400);
  assert.ok(refund.data.error.includes('no funds held'));
});

test('a mocked fund -> dispute -> refund lifecycle only marks refunded after webhook confirmation', async (t) => {
  const fetchImpl = mockFetch({
    'https://api.paystack.co/transaction/initialize': (body) =>
      jsonResponse(200, { status: true, data: { authorization_url: 'https://paystack.test/pay/xyz', access_code: 'xyz' } }),
    'https://api.paystack.co/refund': (body) =>
      jsonResponse(200, { status: true, data: { transaction_reference: body.transaction, status: 'pending' } }),
  });
  await boot(fetchImpl);
  t.after(teardown);
  const client = await signup('Refund Client', 'refund-client@example.test');
  const freelancer = await signup('Refund Freelancer', 'refund-freelancer@example.test');
  const milestoneId = await fundedAndDisputedMilestone(client, freelancer, base);

  const blockedRefund = await request(`/milestones/${milestoneId}/refund`, {}, freelancer);
  assert.equal(blockedRefund.status, 403);

  const refund = await request(`/milestones/${milestoneId}/refund`, {}, client);
  assert.equal(refund.status, 201);
  assert.equal(refund.data.status, 'refund_pending');

  const beforeWebhook = await request(`/milestones/${milestoneId}/funding`, undefined, client, 'GET');
  assert.equal(beforeWebhook.data.status, 'refund_pending');

  const event = { event: 'refund.processed', data: { reference: refund.data.provider_reference } };
  const rawBody = Buffer.from(JSON.stringify(event));
  const signature = createHmac('sha512', PAYSTACK_SECRET).update(rawBody).digest('hex');
  await fetch(`${base}/api/webhooks/paystack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-paystack-signature': signature },
    body: rawBody,
  });

  const afterWebhook = await request(`/milestones/${milestoneId}/funding`, undefined, client, 'GET');
  assert.equal(afterWebhook.data.status, 'refunded');
  assert.ok(afterWebhook.data.refunded_at);
});

test('a failed refund API call marks refund_failed, never refunded', async (t) => {
  const fetchImpl = mockFetch({
    'https://api.paystack.co/transaction/initialize': (body) =>
      jsonResponse(200, { status: true, data: { authorization_url: 'https://paystack.test/pay/fail', access_code: 'fail' } }),
    'https://api.paystack.co/refund': () => jsonResponse(400, { status: false, message: 'Refund window has passed.' }),
  });
  await boot(fetchImpl);
  t.after(teardown);
  const client = await signup('FailRefund Client', 'failrefund-client@example.test');
  const freelancer = await signup('FailRefund Freelancer', 'failrefund-freelancer@example.test');
  const milestoneId = await fundedAndDisputedMilestone(client, freelancer, base);

  const refund = await request(`/milestones/${milestoneId}/refund`, {}, client);
  assert.equal(refund.status, 502);

  const funding = await request(`/milestones/${milestoneId}/funding`, undefined, client, 'GET');
  assert.equal(funding.data.status, 'refund_failed');
});
