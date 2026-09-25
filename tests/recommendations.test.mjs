import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createFundedTestApp as createApp } from './support/funded-app.mjs';

let app, store, server, base;
before(async () => {
  ({ app, store } = await createApp({
    filename: ':memory:',
    rateLimits: { api: { max: 1000 }, auth: { max: 1000 }, mutation: { max: 1000 } },
    aiProvider: {
      name: 'test',
      model: 'test',
      async review(context) {
        return { review: { summary: `Reviewed: ${context.question.slice(0, 30)}`, assumptions: [], suggestions: [], evidenceIds: [] } };
      },
    },
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
    name: 'Rec Owner',
    email: `rec-${counter}-${Date.now()}@example.test`,
    password: `a-long-rec-password-${counter}`,
    context: 'Founder',
  });
  assert.equal(result.status, 201);
  return result.cookie;
}
async function enableAI(cookie) {
  const state = (await request('/state', undefined, cookie, 'GET')).data;
  await store.db.prepare('UPDATE users SET verified_at = ? WHERE id = ?').run(Date.now(), state.user.id);
  const settings = (await request('/ai/settings', undefined, cookie, 'GET')).data;
  assert.equal(
    (await request('/ai/settings', { enabled: true, dailyLimit: 100, version: settings.version }, cookie, 'PATCH')).status,
    200,
  );
  return cookie;
}
async function goal(cookie, title = 'Ship the new pricing page') {
  const created = await request(
    '/objectives',
    { title, description: '', context: 'Founder', priority: 'High', status: 'Active', targetDate: '', constraints: '', success: '' },
    cookie,
  );
  assert.equal(created.status, 201);
  return created.data;
}
async function action(cookie, objectiveId, status = 'Done') {
  const created = await request('/actions', { objectiveId, title: 'Finish the work', owner: 'Owner' }, cookie);
  assert.equal(created.status, 201);
  if (status === 'Planned') return created.data;
  const inProgress = await request(`/actions/${created.data.id}`, { version: created.data.version, status: 'In progress' }, cookie, 'PATCH');
  assert.equal(inProgress.status, 200, JSON.stringify(inProgress.data));
  if (status === 'In progress') return inProgress.data;
  const done = await request(`/actions/${created.data.id}`, { version: inProgress.data.version, status: 'Done' }, cookie, 'PATCH');
  assert.equal(done.status, 200, JSON.stringify(done.data));
  return done.data;
}

async function advanceToActive(cookie, goalId) {
  for (const stage of ['clarified', 'baseline_established', 'path_defined', 'active']) {
    const r = await request(`/objectives/${goalId}/goal/stage`, { stage }, cookie, 'PATCH');
    assert.equal(r.status, 200, JSON.stringify(r.data));
  }
}

test('goal-advisor creates a trackable recommendation when it suggests a stage move, and it can be accepted', async () => {
  const cookie = await enableAI(await signup());
  const created = await goal(cookie);
  await advanceToActive(cookie, created.id);
  await action(cookie, created.id, 'Done');

  const advice = await request('/companion/messages', { message: 'give me goal advice', objectiveId: created.id, agentId: 'goal-advisor', consent: true }, cookie);
  assert.equal(advice.status, 201);
  const recId = advice.data.evidence.recommendationId;
  assert.ok(recId, 'a recommendation should have been created since all actions are done');

  const listed = await request(`/recommendations?subjectKind=goal&subjectId=${created.id}`, undefined, cookie, 'GET');
  assert.equal(listed.status, 200);
  assert.equal(listed.data.length, 1);
  assert.equal(listed.data[0].status, 'recommended');

  const accepted = await request(`/recommendations/${recId}/status`, { status: 'accepted' }, cookie, 'PATCH');
  assert.equal(accepted.status, 200);
  assert.equal(accepted.data.status, 'accepted');

  assert.equal(
    (await request(`/recommendations/${recId}/status`, { status: 'recommended' }, cookie, 'PATCH')).status,
    409,
    'cannot move backward from accepted to recommended',
  );

  const completed = await request(`/recommendations/${recId}/status`, { status: 'completed' }, cookie, 'PATCH');
  assert.equal(completed.status, 200);
  assert.equal(completed.data.status, 'completed');

  assert.equal(
    (await request(`/recommendations/${recId}/status`, { status: 'in_progress' }, cookie, 'PATCH')).status,
    409,
    'completed only allows superseded next',
  );
});

test('changing a goal stage invalidates stale intelligence results and open recommendations for it (Change Impact Analyzer)', async () => {
  const cookie = await enableAI(await signup());
  const created = await goal(cookie);
  await advanceToActive(cookie, created.id);
  await action(cookie, created.id, 'Done');

  const advice = await request('/companion/messages', { message: 'give me goal advice', objectiveId: created.id, agentId: 'goal-advisor', consent: true }, cookie);
  assert.equal(advice.status, 201);
  const recId = advice.data.evidence.recommendationId;
  assert.ok(recId);

  const freshBefore = await request(`/intelligence-results?subjectKind=goal&subjectId=${created.id}`, undefined, cookie, 'GET');
  assert.equal(freshBefore.data.length, 1, 'goal-advisor should have written a fresh intelligence result');

  // A material change to the goal itself: the stage moves.
  const moved = await request(`/objectives/${created.id}/goal/stage`, { stage: 'achieved', reason: 'Delivered.' }, cookie, 'PATCH');
  assert.equal(moved.status, 200);

  const freshAfter = await request(`/intelligence-results?subjectKind=goal&subjectId=${created.id}`, undefined, cookie, 'GET');
  assert.equal(freshAfter.data.length, 0, 'the prior intelligence result must no longer be served as current after a material change');

  const recAfter = await request(`/recommendations?subjectKind=goal&subjectId=${created.id}`, undefined, cookie, 'GET');
  assert.equal(recAfter.data.find((r) => r.id === recId).status, 'invalidated');
});

test('F-SI-05: moving a recommendation to scheduled requires and records a scheduledFor date, and a completed recommendation survives later invalidation', async () => {
  const cookie = await enableAI(await signup());
  const created = await goal(cookie);
  await advanceToActive(cookie, created.id);
  await action(cookie, created.id, 'Done');

  const advice = await request('/companion/messages', { message: 'give me goal advice', objectiveId: created.id, agentId: 'goal-advisor', consent: true }, cookie);
  const recId = advice.data.evidence.recommendationId;
  assert.ok(recId);

  const accepted = await request(`/recommendations/${recId}/status`, { status: 'accepted' }, cookie, 'PATCH');
  assert.equal(accepted.status, 200);

  const missingDate = await request(`/recommendations/${recId}/status`, { status: 'scheduled' }, cookie, 'PATCH');
  assert.equal(missingDate.status, 400, 'scheduling without a date is rejected');

  const scheduledFor = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const scheduled = await request(`/recommendations/${recId}/status`, { status: 'scheduled', scheduledFor }, cookie, 'PATCH');
  assert.equal(scheduled.status, 200);
  assert.equal(scheduled.data.scheduled_for, scheduledFor);

  const inProgress = await request(`/recommendations/${recId}/status`, { status: 'in_progress' }, cookie, 'PATCH');
  assert.equal(inProgress.status, 200);
  const completed = await request(`/recommendations/${recId}/status`, { status: 'completed' }, cookie, 'PATCH');
  assert.equal(completed.status, 200);

  // A later material change to the goal must not overwrite the completed historical evidence.
  const moved = await request(`/objectives/${created.id}/goal/stage`, { stage: 'achieved', reason: 'Delivered.' }, cookie, 'PATCH');
  assert.equal(moved.status, 200);
  const recAfter = await request(`/recommendations?subjectKind=goal&subjectId=${created.id}`, undefined, cookie, 'GET');
  assert.equal(recAfter.data.find((r) => r.id === recId).status, 'completed', 'a completed recommendation is preserved history, not silently invalidated');
});
