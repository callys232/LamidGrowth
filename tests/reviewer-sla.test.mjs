import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createFundedTestApp as createApp } from './support/funded-app.mjs';

let app, store, server, base;
before(async () => {
  ({ app, store } = await createApp({
    filename: ':memory:',
    rateLimits: { api: { max: 1000 }, auth: { max: 1000 }, mutation: { max: 1000 } },
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
async function signup() {
  counter++;
  const result = await request('/auth/signup', {
    name: 'SLA Owner',
    email: `sla-${counter}-${Date.now()}@example.test`,
    password: `a-long-sla-password-${counter}`,
    context: 'Founder',
  });
  assert.equal(result.status, 201);
  return result.cookie;
}
async function makeExpert(cookie) {
  const profile = await request(
    '/talent/profile',
    { headline: 'Reviewer', skills: ['Compliance'], domains: ['Legal and compliance'] },
    cookie,
  );
  assert.equal(profile.status, 200);
  // F-SC-02: the review queue is eligibility-gated (verified + matching declared domain) —
  // elevate this fixture reviewer directly, the same shortcut other tests use for admin-gated
  // state.
  const state = await request('/state', undefined, cookie, 'GET');
  await store.db
    .prepare("UPDATE talent_profiles SET vetting_status = 'verified' WHERE user_id = ?")
    .run(state.data.user.id);
  return cookie;
}

test('an expert can declare review availability, and claiming computes a real SLA from it', async () => {
  const expert = await makeExpert(await signup());
  const set = await request(
    '/talent/profile/review-availability',
    { timezone: 'Africa/Lagos', asyncReviewEligible: true, urgentReviewEligible: false, expectedResponseHours: 24 },
    expert,
    'PATCH',
  );
  assert.equal(set.status, 200);
  assert.equal(set.data.timezone, 'Africa/Lagos');
  assert.equal(set.data.async_review_eligible, 1);
  assert.equal(set.data.expected_response_hours, 24);

  const client = await signup();
  const created = await request('/scoping-cases', { objective: 'Draft a compliance policy', problemStatement: '' }, client);
  await request(
    `/scoping-cases/${created.data.id}`,
    { deliverables: 'A signed policy document.', category: 'Legal and compliance', budgetContext: '$1000', timelineContext: '2 weeks' },
    client,
    'PATCH',
  );
  const flagged = await request(`/scoping-cases/${created.data.id}`, undefined, client, 'GET');
  assert.equal(flagged.data.risk_band, 'red');

  const review = await request(`/scoping-cases/${created.data.id}/request-review`, {}, client);
  assert.equal(review.status, 201);

  const claimed = await request(`/review-queue/${review.data.id}/claim`, {}, expert, 'POST');
  assert.equal(claimed.status, 200);
  assert.ok(claimed.data.sla_due_at, 'a claiming expert who declared an expected response window gets a real SLA due date');
  const dueMs = new Date(claimed.data.sla_due_at).getTime() - new Date(claimed.data.claimed_at).getTime();
  assert.equal(Math.round(dueMs / (60 * 60 * 1000)), 24);
});

test('a reviewer with no declared response window gets no fabricated SLA', async () => {
  const expert = await makeExpert(await signup());
  const client = await signup();
  const created = await request('/scoping-cases', { objective: 'Draft another compliance policy', problemStatement: '' }, client);
  await request(
    `/scoping-cases/${created.data.id}`,
    { deliverables: 'A policy document.', category: 'Legal and compliance', budgetContext: '$1000', timelineContext: '2 weeks' },
    client,
    'PATCH',
  );
  const review = await request(`/scoping-cases/${created.data.id}/request-review`, {}, client);
  assert.equal(review.status, 201);

  const claimed = await request(`/review-queue/${review.data.id}/claim`, {}, expert, 'POST');
  assert.equal(claimed.status, 200);
  assert.equal(claimed.data.sla_due_at, null);
});
