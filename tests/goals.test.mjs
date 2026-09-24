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
        const source = (context.sources || [])[0];
        return {
          review: {
            summary: `AI summary for goal "${source.data.title}" at stage "${source.data.stage}": ${context.question}`,
            assumptions: [],
            suggestions: [],
            evidenceIds: (context.sources || []).map((s) => s.id),
          },
        };
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
    name: 'Goals Owner',
    email: `goals-${counter}-${Date.now()}@example.test`,
    password: `a-long-goals-password-${counter}`,
    context: 'Founder',
  });
  assert.equal(result.status, 201);
  return result.cookie;
}
// External AI requires a verified account and workspace opt-in (see aiPolicy.mjs) — same real
// endpoint a user's settings page uses, not a database shortcut.
async function enableAI(cookie) {
  const state = (await request('/state', undefined, cookie, 'GET')).data;
  await store.db
    .prepare('UPDATE users SET verified_at = ? WHERE id = ?')
    .run(Date.now(), state.user.id);
  const settings = (await request('/ai/settings', undefined, cookie, 'GET')).data;
  assert.equal(
    (
      await request(
        '/ai/settings',
        { enabled: true, dailyLimit: 100, version: settings.version },
        cookie,
        'PATCH',
      )
    ).status,
    200,
  );
  return cookie;
}
async function goal(cookie, title = 'Become a stronger operator') {
  const created = await request(
    '/objectives',
    {
      title,
      description: '',
      context: 'Founder',
      priority: 'High',
      status: 'Active',
      targetDate: '',
      constraints: '',
      success: '',
    },
    cookie,
  );
  assert.equal(created.status, 201);
  return created.data;
}

test('a new goal starts at the "captured" lifecycle stage with no subscriptions', async () => {
  const cookie = await signup();
  const created = await goal(cookie);
  const state = await request(`/objectives/${created.id}/goal`, undefined, cookie, 'GET');
  assert.equal(state.status, 200);
  assert.equal(state.data.stage, 'captured');
  assert.deepEqual(state.data.subscriptions, []);
});

test('goal lifecycle stage only moves through allowed transitions, and terminal stages are final', async () => {
  const cookie = await signup();
  const created = await goal(cookie);

  assert.equal(
    (await request(`/objectives/${created.id}/goal/stage`, { stage: 'active' }, cookie, 'PATCH')).status,
    409,
    'cannot skip straight from captured to active',
  );

  const path = ['clarified', 'baseline_established', 'path_defined', 'active', 'progressing'];
  for (const stage of path) {
    const result = await request(`/objectives/${created.id}/goal/stage`, { stage }, cookie, 'PATCH');
    assert.equal(result.status, 200, `expected to reach ${stage}: ${JSON.stringify(result.data)}`);
    assert.equal(result.data.stage, stage);
  }

  const toTerminal = await request(
    `/objectives/${created.id}/goal/stage`,
    { stage: 'achieved', reason: 'Delivered the outcome.' },
    cookie,
    'PATCH',
  );
  assert.equal(toTerminal.status, 200);
  assert.equal(toTerminal.data.stage, 'achieved');

  assert.equal(
    (await request(`/objectives/${created.id}/goal/stage`, { stage: 'active' }, cookie, 'PATCH')).status,
    409,
    'a terminal stage cannot progress further',
  );
});

test('a goal subscription can be created, listed and removed', async () => {
  const cookie = await signup();
  const created = await goal(cookie);
  const stranger = await signup();

  const opened = await request(
    `/objectives/${created.id}/goal/subscriptions`,
    { signalClasses: ['jobs', 'training'], constraints: { location: 'Remote' }, attentionPolicy: 'digest' },
    cookie,
  );
  assert.equal(opened.status, 201);
  assert.deepEqual(opened.data.signalClasses, ['jobs', 'training']);

  assert.equal(
    (await request(`/objectives/${created.id}/goal/subscriptions`, undefined, stranger, 'GET')).status,
    404,
    'a workspace cannot list subscriptions on a goal it does not own',
  );

  const listed = await request(`/objectives/${created.id}/goal/subscriptions`, undefined, cookie, 'GET');
  assert.equal(listed.status, 200);
  assert.equal(listed.data.length, 1);

  const state = await request(`/objectives/${created.id}/goal`, undefined, cookie, 'GET');
  assert.equal(state.data.subscriptions.length, 1);

  assert.equal(
    (await request(`/goal-subscriptions/${opened.data.id}`, {}, stranger, 'DELETE')).status,
    404,
    'a workspace cannot delete a subscription it does not own',
  );
  const removed = await request(`/goal-subscriptions/${opened.data.id}`, {}, cookie, 'DELETE');
  assert.equal(removed.status, 204);
  assert.equal((await request(`/objectives/${created.id}/goal/subscriptions`, undefined, cookie, 'GET')).data.length, 0);
});

test('the goal advisor requires an objectiveId before charging points, and assists once given one', async () => {
  const cookie = await enableAI(await signup());
  const before = await request('/state', undefined, cookie, 'GET');
  const balanceBefore = before.data.user.points_balance;

  const missing = await request(
    '/companion/messages',
    { message: 'give me goal advice', consent: true },
    cookie,
  );
  assert.equal(missing.status, 422);
  const after = await request('/state', undefined, cookie, 'GET');
  assert.equal(after.data.user.points_balance, balanceBefore);

  const created = await goal(cookie, 'Reach senior data analyst');
  const advice = await request(
    '/companion/messages',
    { message: 'give me goal advice', objectiveId: created.id, consent: true },
    cookie,
  );
  assert.equal(advice.status, 201);
  assert.equal(advice.data.agentId, 'goal-advisor');
  assert.ok(advice.data.response.includes('Reach senior data analyst'));
  assert.equal(advice.data.evidence.stage, 'captured');
});
