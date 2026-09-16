import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app/app.mjs';

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
  return { status: response.status, data: await response.json() };
}
async function demo() {
  const response = await fetch(`${base}/api/auth/demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(response.status, 201);
  return response.headers.get('set-cookie')?.split(';')[0];
}

test('activity feed requires authentication', async () => {
  assert.equal((await request('/activity', undefined, undefined, 'GET')).status, 401);
});

test('activity feed merges jobs, workflows, and agent runs, sorted by recency', async () => {
  const cookie = await demo();
  const state = (await request('/state', undefined, cookie, 'GET')).data;
  await store.db.prepare('UPDATE users SET points_balance = 1000 WHERE id = ?').run(state.user.id);
  const objective = state.objectives[0];

  const job = await request(
    '/jobs',
    {
      title: 'Feed test job',
      category: 'Software engineering',
      projectType: 'Fixed-scope project',
      description: 'A job created purely to check it shows up in the activity feed.',
      deliverables: 'Nothing real, this is a test job.',
      budgetMin: 100,
      budgetMax: 200,
      currency: 'USD',
      timeline: '1 week',
    },
    cookie,
  );
  assert.equal(job.status, 201);

  const workflow = await request(
    '/workflows',
    {
      title: 'Feed test workflow',
      objectiveId: objective.id,
      steps: [{ id: 'context', toolId: 'context.snapshot' }],
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    },
    cookie,
  );
  assert.equal(workflow.status, 201);

  const message = await request(
    '/companion/messages',
    { message: 'what is going on right now?' },
    cookie,
  );
  assert.equal(message.status, 201);

  const activity = await request('/activity', undefined, cookie, 'GET');
  assert.equal(activity.status, 200);
  const types = activity.data.map((item) => item.type);
  assert.ok(types.includes('job'));
  assert.ok(types.includes('workflow'));
  assert.ok(types.includes('agent_run'));
  assert.ok(types.includes('points'));

  const timestamps = activity.data.map((item) => Date.parse(item.createdAt));
  const sorted = [...timestamps].sort((a, b) => b - a);
  assert.deepEqual(timestamps, sorted);
});
