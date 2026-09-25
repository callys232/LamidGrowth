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
    name: 'Return State Owner',
    email: `return-state-${counter}-${Date.now()}@example.test`,
    password: `a-long-return-state-password-${counter}`,
    context: 'Founder',
  });
  assert.equal(result.status, 201);
  return result.cookie;
}
async function goal(cookie, title = 'Ship the feature') {
  const created = await request(
    '/objectives',
    { title, description: '', context: 'Founder', priority: 'High', status: 'Active', targetDate: '', constraints: '', success: '' },
    cookie,
  );
  assert.equal(created.status, 201);
  return created.data;
}

test('F-CORE-02: a checkpoint moves the since boundary — an old material change drops out of the next call', async () => {
  const cookie = await signup();
  const created = await goal(cookie);

  const changed = await request(`/objectives/${created.id}`, { version: created.version, title: 'Renamed' }, cookie, 'PATCH');
  assert.equal(changed.status, 200, JSON.stringify(changed.data));

  const before = await request('/return-state', undefined, cookie, 'GET');
  assert.equal(before.status, 200);
  assert.ok(before.data.audit.items.some((a) => a.object_id === created.id), 'the material edit shows up before any checkpoint');

  const marked = await request('/return-state/checkpoint', { lane: 'audit' }, cookie);
  assert.equal(marked.status, 200);
  assert.ok(marked.data.lastReviewedAt);

  const after = await request('/return-state', undefined, cookie, 'GET');
  assert.equal(after.status, 200);
  assert.ok(
    !after.data.audit.items.some((a) => a.object_id === created.id),
    'a material change reviewed before the checkpoint must not reappear after it',
  );
  assert.equal(after.data.audit.lastReviewedAt, marked.data.lastReviewedAt);

  // A later edit after the checkpoint shows up again.
  const second = await request(`/objectives/${created.id}`, { version: 2, title: 'Renamed again' }, cookie, 'PATCH');
  assert.equal(second.status, 200, JSON.stringify(second.data));
  const afterSecondEdit = await request('/return-state', undefined, cookie, 'GET');
  assert.ok(afterSecondEdit.data.audit.items.some((a) => a.object_id === created.id));
});

test('F-CORE-02: tasks, workflows-needing-approval, and per-user isolation all surface real signals', async () => {
  const client = await signup();
  const before = await request('/return-state', undefined, client, 'GET');
  assert.equal(before.status, 200);
  assert.deepEqual(before.data.tasks.items, []);
  assert.deepEqual(before.data.workflows.items, []);

  const stranger = await signup();
  const strangerView = await request('/return-state', undefined, stranger, 'GET');
  assert.equal(strangerView.status, 200);
  assert.deepEqual(strangerView.data.audit.items, []);
});

test('F-CORE-02: a silent goal subscription is excluded from the aggregation, and a digest one waits for its window', async () => {
  const cookie = await signup();
  const created = await goal(cookie);

  const silentSub = await request(
    `/objectives/${created.id}/goal/subscriptions`,
    { signalClasses: ['jobs'], attentionPolicy: 'silent' },
    cookie,
  );
  assert.equal(silentSub.status, 201);
  const digestSub = await request(
    `/objectives/${created.id}/goal/subscriptions`,
    { signalClasses: ['jobs'], attentionPolicy: 'digest' },
    cookie,
  );
  assert.equal(digestSub.status, 201);

  const poster = await signup();
  const job = await request(
    '/jobs',
    {
      title: 'Return-state signal job',
      category: 'UX/UI design',
      projectType: 'Fixed-scope project',
      description: 'A job used to test return-state digest gating.',
      deliverables: 'A page.',
      budgetMin: 200,
      budgetMax: 500,
      currency: 'USD',
      timeline: '1 week',
    },
    poster,
  );
  assert.equal(job.status, 201);
  await request(`/goal-subscriptions/${silentSub.data.id}/scan`, {}, cookie);
  await request(`/goal-subscriptions/${digestSub.data.id}/scan`, {}, cookie);

  // No goals checkpoint yet (age is treated as infinite) — the digest item is included.
  const noCheckpoint = await request('/return-state', undefined, cookie, 'GET');
  assert.equal(noCheckpoint.status, 200);
  const bySubscription = (items, subId) => items.filter((i) => i.subscription_id === subId);
  assert.equal(bySubscription(noCheckpoint.data.goals.items, silentSub.data.id).length, 0, 'a silent subscription is never surfaced');
  assert.equal(bySubscription(noCheckpoint.data.goals.items, digestSub.data.id).length, 1, 'with no checkpoint yet, a digest item is still shown');

  // Mark the goals lane reviewed right now — the digest item must not reappear immediately.
  await request('/return-state/checkpoint', { lane: 'goals' }, cookie);
  const justChecked = await request('/return-state', undefined, cookie, 'GET');
  assert.equal(bySubscription(justChecked.data.goals.items, digestSub.data.id).length, 0, 'a fresh checkpoint holds back a digest item until its window passes');
  assert.equal(bySubscription(justChecked.data.goals.items, silentSub.data.id).length, 0);

  // Backdate the checkpoint past the digest window — the item reappears.
  await store.db
    .prepare("UPDATE return_state_checkpoints SET last_reviewed_at = ? WHERE lane = 'goals'")
    .run(new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString());
  const pastWindow = await request('/return-state', undefined, cookie, 'GET');
  assert.equal(bySubscription(pastWindow.data.goals.items, digestSub.data.id).length, 1);
});
