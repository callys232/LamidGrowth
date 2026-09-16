import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createFundedTestApp as createApp } from './support/funded-app.mjs';

let app, store, server, base;
before(async () => {
  ({ app, store } = await createApp({
    filename: ':memory:',
    rateLimits: { api: { max: 1000 }, auth: { max: 1000 }, mutation: { max: 1000 }, spend: { max: 1000 } },
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
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get('set-cookie')?.split(';')[0],
  };
}
let counter = 0;
async function signup(name) {
  counter++;
  const result = await request('/auth/signup', {
    name,
    email: `invite-${counter}-${Date.now()}@example.test`,
    password: `a-long-invite-password-${counter}`,
    context: 'Founder',
  });
  assert.equal(result.status, 201);
  return result.cookie;
}
async function postJob(client, title = 'Invitation test job') {
  const job = await request(
    '/jobs',
    {
      title,
      category: 'Software engineering',
      projectType: 'Fixed-scope project',
      description: 'A job used to exercise the invitation flow end to end.',
      deliverables: 'A completed deliverable.',
      budgetMin: 500,
      budgetMax: 2000,
      currency: 'USD',
      timeline: '2 weeks',
    },
    client,
  );
  assert.equal(job.status, 201);
  return job.data;
}

test('inviting, accepting, then creating a project without ever submitting a bid', async () => {
  const client = await signup('Invite Client');
  const freelancer = await signup('Invite Freelancer');
  const freelancerState = (await request('/state', undefined, freelancer, 'GET')).data;
  const job = await postJob(client);

  const invite = await request(
    `/jobs/${job.id}/invitations`,
    { freelancerUserId: freelancerState.user.id, message: 'We would love to have you on this project.' },
    client,
  );
  assert.equal(invite.status, 201);
  assert.equal(invite.data.status, 'pending');

  const mine = await request('/talent/invitations/mine', undefined, freelancer, 'GET');
  assert.equal(mine.data.length, 1);
  assert.equal(mine.data[0].jobTitle, 'Invitation test job');

  const accept = await request(`/invitations/${invite.data.id}/respond`, { decision: 'accept' }, freelancer);
  assert.equal(accept.status, 200);
  assert.equal(accept.data.status, 'accepted');

  const project = await request(
    '/projects',
    { jobId: job.id, title: 'Invited project', freelancerUserId: freelancerState.user.id },
    client,
  );
  assert.equal(project.status, 201);

  // Status is visible to the client via the job-owner view too.
  const clientView = await request(`/jobs/${job.id}/invitations`, undefined, client, 'GET');
  assert.equal(clientView.data[0].status, 'accepted');
});

test('rejecting an invitation still leaves project creation blocked without a real bid', async () => {
  const client = await signup('Reject Client');
  const freelancer = await signup('Reject Freelancer');
  const freelancerState = (await request('/state', undefined, freelancer, 'GET')).data;
  const job = await postJob(client, 'Rejected invite job');

  const invite = await request('/jobs/' + job.id + '/invitations', { freelancerUserId: freelancerState.user.id }, client);
  const reject = await request(`/invitations/${invite.data.id}/respond`, { decision: 'reject' }, freelancer);
  assert.equal(reject.status, 200);
  assert.equal(reject.data.status, 'rejected');

  const project = await request(
    '/projects',
    { jobId: job.id, title: 'Should fail', freelancerUserId: freelancerState.user.id },
    client,
  );
  assert.equal(project.status, 400);
});

test('only the job owner can invite; only the invited freelancer can respond; duplicates are rejected', async () => {
  const client = await signup('Auth Client');
  const stranger = await signup('Auth Stranger');
  const freelancer = await signup('Auth Freelancer');
  const otherFreelancer = await signup('Other Freelancer');
  const freelancerState = (await request('/state', undefined, freelancer, 'GET')).data;
  const job = await postJob(client, 'Auth invite job');

  const strangerInvite = await request(`/jobs/${job.id}/invitations`, { freelancerUserId: freelancerState.user.id }, stranger);
  assert.equal(strangerInvite.status, 403);

  const invite = await request(`/jobs/${job.id}/invitations`, { freelancerUserId: freelancerState.user.id }, client);
  assert.equal(invite.status, 201);

  const duplicate = await request(`/jobs/${job.id}/invitations`, { freelancerUserId: freelancerState.user.id }, client);
  assert.equal(duplicate.status, 409);

  const wrongResponder = await request(`/invitations/${invite.data.id}/respond`, { decision: 'accept' }, otherFreelancer);
  assert.equal(wrongResponder.status, 403);

  const decided = await request(`/invitations/${invite.data.id}/respond`, { decision: 'accept' }, freelancer);
  assert.equal(decided.status, 200);
  const redecide = await request(`/invitations/${invite.data.id}/respond`, { decision: 'reject' }, freelancer);
  assert.equal(redecide.status, 409);
});

test('an accepted/rejected invitation shows up in both parties\' activity feeds', async () => {
  const client = await signup('Activity Client');
  const freelancer = await signup('Activity Freelancer');
  const freelancerState = (await request('/state', undefined, freelancer, 'GET')).data;
  const job = await postJob(client, 'Activity feed job');
  const invite = await request(`/jobs/${job.id}/invitations`, { freelancerUserId: freelancerState.user.id }, client);
  await request(`/invitations/${invite.data.id}/respond`, { decision: 'accept' }, freelancer);

  const clientActivity = await request('/activity', undefined, client, 'GET');
  assert.ok(clientActivity.data.some((item) => item.type === 'invitation' && item.title.includes('sent')));

  const freelancerActivity = await request('/activity', undefined, freelancer, 'GET');
  assert.ok(freelancerActivity.data.some((item) => item.type === 'invitation' && item.title.includes('received')));
});
