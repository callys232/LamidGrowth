import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createFundedTestApp as createApp } from './support/funded-app.mjs';
import { paystackProvider } from '../src/app/payments.mjs';

const PAYSTACK_SECRET = 'sk_test_overview_fixture';
const adminEmail = 'overview-admin@lamidgrowth.test';

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

let app, store, server, base, adminCookie;
before(async () => {
  const fetchImpl = mockFetch({
    'https://api.paystack.co/transaction/initialize': (body) =>
      jsonResponse(200, {
        status: true,
        data: { authorization_url: 'https://paystack.test/pay/m', access_code: 'm' },
      }),
  });
  const paymentProvider = (name) =>
    name === 'paystack' ? paystackProvider({ secretKey: PAYSTACK_SECRET, fetchImpl }) : null;
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
  adminCookie = await signup('Overview Admin', adminEmail);
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await store.db.close();
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
    email: email || `overview-${counter}-${Date.now()}@example.test`,
    password: `a-long-overview-password-${counter}`,
    context: 'Founder',
  });
  assert.equal(result.status, 201);
  return result.cookie;
}
async function fundAMilestone(amount) {
  const client = await signup('Overview Client');
  const freelancer = await signup('Overview Freelancer');
  const job = await request(
    '/jobs',
    {
      title: 'Overview job',
      category: 'Software engineering',
      projectType: 'Fixed-scope project',
      description: 'A job used to seed the escrow overview aggregation.',
      deliverables: 'Something.',
      budgetMin: 100,
      budgetMax: 2000,
      currency: 'USD',
      timeline: '1 week',
    },
    client,
  );
  await request(
    `/jobs/${job.data.id}/bids`,
    {
      coverLetter: 'A bid for this job that is long enough.',
      proposedAmount: amount,
      currency: 'USD',
      timeline: '1 week',
    },
    freelancer,
  );
  const freelancerState = (await request('/state', undefined, freelancer, 'GET')).data;
  const project = await request(
    '/projects',
    { jobId: job.data.id, title: 'Overview project', freelancerUserId: freelancerState.user.id },
    client,
  );
  const milestone = await request(
    `/projects/${project.data.id}/milestones`,
    { title: 'Phase 1', description: '', amount, currency: 'USD' },
    client,
  );
  const fund = await request(`/milestones/${milestone.data.id}/fund`, {}, client);
  const event = {
    event: 'charge.success',
    data: { reference: fund.data.reference, amount: fund.data.amountMinor, currency: fund.data.currency },
  };
  const rawBody = Buffer.from(JSON.stringify(event));
  const signature = createHmac('sha512', PAYSTACK_SECRET).update(rawBody).digest('hex');
  await fetch(`${base}/api/webhooks/paystack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-paystack-signature': signature },
    body: rawBody,
  });
  return { client, milestoneId: milestone.data.id };
}

test('a non-admin is blocked from the escrow overview', async () => {
  const stranger = await signup('Overview Stranger');
  const attempt = await request('/admin/escrow-overview', undefined, stranger, 'GET');
  assert.equal(attempt.status, 403);
});

test('an ecosystem admin sees correctly aggregated totals across multiple workspaces', async () => {
  await fundAMilestone(300);
  await fundAMilestone(500);

  const overview = await request('/admin/escrow-overview', undefined, adminCookie, 'GET');
  assert.equal(overview.status, 200);
  assert.equal(overview.data.totals.heldMinor, 80000); // (300 + 500) * 100
  assert.equal(overview.data.byStatus.held, 2);
  assert.equal(overview.data.currentlyHeld.length, 2);
});
