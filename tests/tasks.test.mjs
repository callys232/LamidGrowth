import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createFundedTestApp as createApp } from './support/funded-app.mjs';
import { paystackProvider } from '../src/app/payments.mjs';

const PAYSTACK_SECRET = 'sk_test_tasks_fixture';

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
  const paymentProvider = (name) =>
    name === 'paystack'
      ? paystackProvider({ secretKey: PAYSTACK_SECRET, fetchImpl: mockFetch({
          'https://api.paystack.co/transaction/initialize': () =>
            jsonResponse(200, {
              status: true,
              data: { authorization_url: 'https://paystack.test/pay/xyz', access_code: 'xyz' },
            }),
          'https://api.paystack.co/transferrecipient': () =>
            jsonResponse(200, { status: true, data: { recipient_code: 'RCP_tasks_1' } }),
          'https://api.paystack.co/transfer': (body) =>
            jsonResponse(200, { status: true, data: { reference: body.reference, status: 'pending' } }),
        }) })
      : null;
  ({ app, store } = await createApp({
    filename: ':memory:',
    paymentProvider,
    rateLimits: { api: { max: 1000 }, auth: { max: 1000 }, mutation: { max: 1000 }, spend: { max: 1000 } },
  }));
  server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await store.dropSchema();
});
async function request(path, body, cookie, method) {
  const verb = method || (body === undefined ? 'GET' : 'POST');
  const response = await fetch(`${base}/api${path}`, {
    method: verb,
    headers: {
      // The app requires Content-Type: application/json on every non-GET/HEAD/OPTIONS request as
      // a CSRF guard, even one with no body (e.g. DELETE) — so this must key off the verb, not
      // whether a body was actually passed.
      ...(['GET', 'HEAD', 'OPTIONS'].includes(verb) ? {} : { 'Content-Type': 'application/json' }),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: response.status,
    data: response.status === 204 ? null : await response.json(),
    cookie: response.headers.get('set-cookie')?.split(';')[0],
  };
}
let counter = 0;
async function signup(name) {
  counter++;
  const result = await request('/auth/signup', {
    name,
    email: `tasks-${counter}-${Date.now()}@example.test`,
    password: `a-long-tasks-password-${counter}`,
    context: 'Founder',
  });
  assert.equal(result.status, 201);
  return result.cookie;
}
async function projectWithParties() {
  const client = await signup('Tasks Client');
  const freelancer = await signup('Tasks Freelancer');
  const freelancerState = (await request('/state', undefined, freelancer, 'GET')).data;
  const job = await request(
    '/jobs',
    {
      title: 'Tasks fixture job',
      category: 'Software engineering',
      projectType: 'Fixed-scope project',
      description: 'A job used purely to exercise task management.',
      deliverables: 'Nothing real, this is a test job.',
      budgetMin: 500,
      budgetMax: 2000,
      currency: 'USD',
      timeline: '2 weeks',
    },
    client,
  );
  await request(
    `/jobs/${job.data.id}/bids`,
    { coverLetter: 'I will deliver this work.', proposedAmount: 1000, currency: 'USD', timeline: '2 weeks' },
    freelancer,
  );
  const project = await request(
    '/projects',
    { jobId: job.data.id, title: 'Tasks project', freelancerUserId: freelancerState.user.id },
    client,
  );
  return { client, freelancer, freelancerState, project: project.data };
}

test('a task can be created, listed, updated and deleted by either party', async () => {
  const { client, freelancer, project } = await projectWithParties();
  const outsider = await signup('Tasks Outsider');

  const create = await request(
    `/projects/${project.id}/tasks`,
    { title: 'Draft the kickoff notes', description: '' },
    freelancer,
  );
  assert.equal(create.status, 201);
  assert.equal(create.data.status, 'open');
  assert.equal(create.data.attention, null);

  assert.equal(
    (await request(`/projects/${project.id}/tasks`, { title: 'blocked' }, outsider)).status,
    403,
  );

  const list = await request(`/projects/${project.id}/tasks`, undefined, client, 'GET');
  assert.equal(list.status, 200);
  assert.equal(list.data.length, 1);

  const update = await request(`/tasks/${create.data.id}`, { status: 'in_progress' }, client, 'PATCH');
  assert.equal(update.status, 200);
  assert.equal(update.data.status, 'in_progress');

  assert.equal((await request(`/tasks/${create.data.id}`, {}, outsider, 'PATCH')).status, 403);

  const del = await request(`/tasks/${create.data.id}`, {}, freelancer, 'DELETE');
  assert.equal(del.status, 204);
  assert.equal((await request(`/projects/${project.id}/tasks`, undefined, client, 'GET')).data.length, 0);
});

test('overdue and blocked tasks surface in the attention feed; done tasks never do', async () => {
  const { client, freelancer, project } = await projectWithParties();

  const overdue = await request(
    `/projects/${project.id}/tasks`,
    { title: 'Overdue task', dueAt: new Date(Date.now() - 86400000).toISOString() },
    client,
  );
  const blocked = await request(`/projects/${project.id}/tasks`, { title: 'Blocked task' }, client);
  await request(`/tasks/${blocked.data.id}`, { blocked: true, blockedReason: 'Waiting on client input' }, freelancer, 'PATCH');
  const fine = await request(
    `/projects/${project.id}/tasks`,
    { title: 'Not due for a while', dueAt: new Date(Date.now() + 30 * 86400000).toISOString() },
    client,
  );
  const doneButOverdue = await request(
    `/projects/${project.id}/tasks`,
    { title: 'Finished before the deadline mattered', dueAt: new Date(Date.now() - 86400000).toISOString() },
    client,
  );
  await request(`/tasks/${doneButOverdue.data.id}`, { status: 'done' }, client, 'PATCH');

  const attention = await request('/tasks/attention', undefined, client, 'GET');
  assert.equal(attention.status, 200);
  const ids = attention.data.map((task) => task.id);
  assert.ok(ids.includes(overdue.data.id));
  assert.ok(ids.includes(blocked.data.id));
  assert.ok(!ids.includes(fine.data.id));
  assert.ok(!ids.includes(doneButOverdue.data.id));
  const overdueEntry = attention.data.find((task) => task.id === overdue.data.id);
  assert.equal(overdueEntry.attention, 'overdue');
  const blockedEntry = attention.data.find((task) => task.id === blocked.data.id);
  assert.equal(blockedEntry.attention, 'blocked');

  // Also visible to the other party — attention is scoped to the project's parties, not the creator alone.
  const freelancerView = await request('/tasks/attention', undefined, freelancer, 'GET');
  assert.ok(freelancerView.data.map((task) => task.id).includes(overdue.data.id));
});

test('a change request can be opened by either party and decided only by the project owner', async () => {
  const { client, freelancer, project } = await projectWithParties();
  const outsider = await signup('Change Request Outsider');

  const opened = await request(
    `/projects/${project.id}/change-requests`,
    { title: 'Add a second dashboard view', description: 'Client wants an extra view added.' },
    freelancer,
  );
  assert.equal(opened.status, 201);
  assert.equal(opened.data.status, 'pending');

  assert.equal((await request(`/projects/${project.id}/change-requests`, undefined, outsider, 'GET')).status, 403);

  assert.equal(
    (
      await request(
        `/change-requests/${opened.data.id}/decision`,
        { decision: 'approve', reason: '' },
        freelancer,
        'PATCH',
      )
    ).status,
    403,
    'only the project owner (client) may decide a change request',
  );

  const decided = await request(
    `/change-requests/${opened.data.id}/decision`,
    { decision: 'approve', reason: 'Reasonable addition.' },
    client,
    'PATCH',
  );
  assert.equal(decided.status, 200);
  assert.equal(decided.data.status, 'approved');

  assert.equal(
    (
      await request(
        `/change-requests/${opened.data.id}/decision`,
        { decision: 'reject', reason: '' },
        client,
        'PATCH',
      )
    ).status,
    409,
    'a change request cannot be decided twice',
  );
});

test('a project can only be closed once every milestone is fully paid, and only then issues a certificate', async () => {
  const { client, freelancer, freelancerState, project } = await projectWithParties();

  assert.equal(
    (await request(`/projects/${project.id}/close`, {}, client)).status,
    409,
    'no milestones yet',
  );

  const milestone = await request(
    `/projects/${project.id}/milestones`,
    { title: 'Only milestone', description: '', amount: 500, currency: 'USD' },
    client,
  );
  await request(
    `/milestones/${milestone.data.id}/deliverables`,
    { title: 'D', description: '', criteria: ['Work is complete'] },
    client,
  );
  const submission = await request(
    `/milestones/${milestone.data.id}/submissions`,
    { notes: 'Work is complete as agreed.' },
    freelancer,
  );
  const verification = await request(`/submissions/${submission.data.id}/verify`, {}, client);
  await request(
    `/verification-cases/${verification.data.id}/decisions`,
    { decision: 'approve', reason: 'Approved.' },
    client,
  );

  assert.equal(
    (await request(`/projects/${project.id}/close`, {}, freelancer)).status,
    403,
    'only the project owner can close',
  );
  assert.equal(
    (await request(`/projects/${project.id}/close`, {}, client)).status,
    409,
    'approved is not yet paid',
  );
  assert.equal((await request(`/projects/${project.id}/certificate`, undefined, client, 'GET')).status, 409);

  await request(
    '/payment-accounts',
    { provider: 'paystack', accountName: 'Tasks Freelancer', accountNumber: '0123456789', bankCode: '058' },
    freelancer,
  );
  const fund = await request(`/milestones/${milestone.data.id}/fund`, {}, client);
  assert.equal(fund.status, 201);
  const fundEvent = {
    event: 'charge.success',
    data: { reference: fund.data.reference, amount: fund.data.amountMinor, currency: fund.data.currency },
  };
  const fundRaw = Buffer.from(JSON.stringify(fundEvent));
  await fetch(`${base}/api/webhooks/paystack`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-paystack-signature': createHmac('sha512', PAYSTACK_SECRET).update(fundRaw).digest('hex'),
    },
    body: fundRaw,
  });
  const release = await request(`/milestones/${milestone.data.id}/release`, { provider: 'paystack' }, client);
  assert.equal(release.status, 201);
  const transferEvent = {
    event: 'transfer.success',
    data: {
      reference: release.data.provider_reference,
      amount: release.data.amount_minor,
      currency: release.data.currency,
    },
  };
  const transferRaw = Buffer.from(JSON.stringify(transferEvent));
  await fetch(`${base}/api/webhooks/paystack`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-paystack-signature': createHmac('sha512', PAYSTACK_SECRET).update(transferRaw).digest('hex'),
    },
    body: transferRaw,
  });

  const closed = await request(`/projects/${project.id}/close`, {}, client);
  assert.equal(closed.status, 200, JSON.stringify(closed.data));
  assert.equal(closed.data.status, 'closed');

  assert.equal((await request(`/projects/${project.id}/close`, {}, client)).status, 409, 'already closed');

  const certResponse = await fetch(`${base}/api/projects/${project.id}/certificate`, {
    headers: { Cookie: client },
  });
  assert.equal(certResponse.status, 200);
  assert.equal(certResponse.headers.get('content-type'), 'application/pdf');
  const buffer = Buffer.from(await certResponse.arrayBuffer());
  assert.ok(buffer.length > 0);
  assert.equal(buffer.toString('ascii', 0, 4), '%PDF');
  void freelancerState;
});
