import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app/app.mjs';

let app, store, server, base;
const adminEmail = 'reputation-admin@lamidgrowth.test';
before(async () => {
  ({ app, store } = createApp({
    filename: ':memory:',
    rateLimits: { api: { max: 1000 }, auth: { max: 1000 }, mutation: { max: 1000 }, spend: { max: 1000 } },
    ecosystemAdminEmails: [adminEmail],
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
async function approvedMilestone(client, freelancer, freelancerUserId) {
  const job = await request(
    '/jobs',
    {
      title: 'Reputation lifecycle job',
      category: 'Software engineering',
      projectType: 'Fixed-scope project',
      description: 'A job used to exercise the review/reputation flow end to end.',
      deliverables: 'A working dashboard with export and login.',
      budgetMin: 1000,
      budgetMax: 2000,
      currency: 'USD',
      timeline: '4 weeks',
    },
    client,
  );
  await request(
    `/jobs/${job.data.id}/bids`,
    { coverLetter: 'I will build the dashboard with export and login as described.', proposedAmount: 1500, currency: 'USD', timeline: '4 weeks' },
    freelancer,
  );
  const project = await request('/projects', { jobId: job.data.id, title: 'Dashboard build', freelancerUserId }, client);
  const milestone = await request(
    `/projects/${project.data.id}/milestones`,
    { title: 'Phase 1', description: '', amount: 750, currency: 'USD' },
    client,
  );
  const submission = await request(`/milestones/${milestone.data.id}/submissions`, { notes: 'Work is complete as agreed.' }, freelancer);
  const verification = await request(`/submissions/${submission.data.id}/verify`, {}, client);
  await request(`/verification-cases/${verification.data.id}/decisions`, { decision: 'approve', reason: 'Approved.' }, client);
  return { milestoneId: milestone.data.id, projectId: project.data.id };
}

test('a review can only be submitted by a real party on an approved milestone, and not twice', async () => {
  const client = await signup('Review Client', 'review-client@example.test');
  const freelancer = await signup('Review Freelancer', 'review-freelancer@example.test');
  const stranger = await signup('Review Stranger', 'review-stranger@example.test');
  const freelancerState = (await request('/state', undefined, freelancer, 'GET')).data;

  const jobPre = await request(
    '/jobs',
    {
      title: 'Unapproved job',
      category: 'Software engineering',
      projectType: 'Fixed-scope project',
      description: 'A job whose milestone will not be approved before a review is attempted.',
      deliverables: 'N/A',
      budgetMin: 100,
      budgetMax: 200,
      currency: 'USD',
      timeline: '1 week',
    },
    client,
  );
  const bidPre = await request(`/jobs/${jobPre.data.id}/bids`, { coverLetter: 'A bid on the unapproved job, long enough to pass validation.', proposedAmount: 150, currency: 'USD', timeline: '1 week' }, freelancer);
  assert.equal(bidPre.status, 201);
  const projectPre = await request('/projects', { jobId: jobPre.data.id, title: 'Unapproved', freelancerUserId: freelancerState.user.id }, client);
  const milestonePre = await request(`/projects/${projectPre.data.id}/milestones`, { title: 'Phase 1', description: '', amount: 100, currency: 'USD' }, client);
  const tooEarly = await request(`/milestones/${milestonePre.data.id}/review`, { rating: 5 }, client);
  assert.equal(tooEarly.status, 400);

  const { milestoneId } = await approvedMilestone(client, freelancer, freelancerState.user.id);

  const strangerAttempt = await request(`/milestones/${milestoneId}/review`, { rating: 5 }, stranger);
  assert.equal(strangerAttempt.status, 403);

  const clientReview = await request(`/milestones/${milestoneId}/review`, { rating: 5, comment: 'Great work.' }, client);
  assert.equal(clientReview.status, 201);
  assert.equal(clientReview.data.reviewee_user_id, freelancerState.user.id);

  const duplicate = await request(`/milestones/${milestoneId}/review`, { rating: 4 }, client);
  assert.equal(duplicate.status, 409);

  const reputation = await request(`/talent/${freelancerState.user.id}/reputation`, undefined, client, 'GET');
  assert.equal(reputation.status, 200);
  assert.equal(reputation.data.reviewCount, 1);
  assert.equal(reputation.data.averageRating, 5);
});

test('an out-of-range rating is rejected', async () => {
  const client = await signup('Range Client', 'range-client@example.test');
  const freelancer = await signup('Range Freelancer', 'range-freelancer@example.test');
  const freelancerState = (await request('/state', undefined, freelancer, 'GET')).data;
  const { milestoneId } = await approvedMilestone(client, freelancer, freelancerState.user.id);
  const bad = await request(`/milestones/${milestoneId}/review`, { rating: 6 }, client);
  assert.equal(bad.status, 400);
});

test('a restricted conflict disclosure removes an expert from matching results', async () => {
  const admin = await signup('Reputation Admin', adminEmail);
  const freelancer = await signup('Restricted Freelancer', 'restricted-freelancer@example.test');
  const profile = await request('/talent/profile', { headline: 'Restricted expert', skills: ['auditing'] }, freelancer);
  assert.equal(profile.status, 200);
  const disclosure = await request('/talent/conflicts', { description: 'Prior relationship with a bidder.' }, freelancer);
  assert.equal(disclosure.status, 201);

  const beforeRestriction = await request('/talent/experts?skill=auditing', undefined, freelancer, 'GET');
  assert.ok(beforeRestriction.data.some((r) => r.headline === 'Restricted expert'));

  // Non-admin cannot decide a conflict.
  const nonAdminDecision = await request(`/admin/talent/conflicts/${disclosure.data.id}`, { decision: 'restricted' }, freelancer, 'PATCH');
  assert.equal(nonAdminDecision.status, 403);

  const adminDecision = await request(`/admin/talent/conflicts/${disclosure.data.id}`, { decision: 'restricted' }, admin, 'PATCH');
  assert.equal(adminDecision.status, 200);
  assert.equal(adminDecision.data.status, 'restricted');

  const afterRestriction = await request('/talent/experts?skill=auditing', undefined, freelancer, 'GET');
  assert.ok(!afterRestriction.data.some((r) => r.headline === 'Restricted expert'));
});
