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
    name: 'Signal Owner',
    email: `signal-${counter}-${Date.now()}@example.test`,
    password: `a-long-signal-password-${counter}`,
    context: 'Founder',
  });
  assert.equal(result.status, 201);
  return result.cookie;
}
async function goal(cookie, title = 'Land a new client') {
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

test('a jobs subscription scan finds an open job posted after it was created, and re-scanning does not duplicate it', async () => {
  const cookie = await signup();
  const created = await goal(cookie);
  const subscription = await request(
    `/objectives/${created.id}/goal/subscriptions`,
    { signalClasses: ['jobs'], attentionPolicy: 'digest' },
    cookie,
  );
  assert.equal(subscription.status, 201);

  // A job posted by a different account after the subscription was created.
  const poster = await signup();
  const job = await request(
    '/jobs',
    {
      title: 'Build a landing page',
      category: 'UX/UI design',
      projectType: 'Fixed-scope project',
      description: 'Need a landing page fast for our new product launch.',
      deliverables: 'A single responsive page.',
      budgetMin: 200,
      budgetMax: 500,
      currency: 'USD',
      timeline: '1 week',
    },
    poster,
  );
  assert.equal(job.status, 201);

  const firstScan = await request(`/goal-subscriptions/${subscription.data.id}/scan`, {}, cookie, 'POST');
  assert.equal(firstScan.status, 200);
  assert.equal(firstScan.data.newMatches.length, 1);
  assert.equal(firstScan.data.newMatches[0].sourceId, job.data.id);

  const secondScan = await request(`/goal-subscriptions/${subscription.data.id}/scan`, {}, cookie, 'POST');
  assert.equal(secondScan.status, 200);
  assert.equal(secondScan.data.newMatches.length, 0, 're-scanning must not duplicate an already-found match');

  const listed = await request(`/goal-subscriptions/${subscription.data.id}/matches`, undefined, cookie, 'GET');
  assert.equal(listed.data.length, 1);
  assert.equal(listed.data[0].seen, false);

  const markedSeen = await request(`/goal-signal-matches/${listed.data[0].id}/seen`, {}, cookie, 'PATCH');
  assert.equal(markedSeen.status, 200);
  const relisted = await request(`/goal-subscriptions/${subscription.data.id}/matches`, undefined, cookie, 'GET');
  assert.equal(relisted.data[0].seen, true);
});

test('a subscription to an unsupported signal class reports it honestly instead of fabricating matches', async () => {
  const cookie = await signup();
  const created = await goal(cookie);
  const subscription = await request(
    `/objectives/${created.id}/goal/subscriptions`,
    { signalClasses: ['grants', 'jobs'], attentionPolicy: 'digest' },
    cookie,
  );
  assert.equal(subscription.status, 201);

  const scan = await request(`/goal-subscriptions/${subscription.data.id}/scan`, {}, cookie, 'POST');
  assert.equal(scan.status, 200);
  assert.deepEqual(scan.data.unsupportedSignalClasses, ['grants']);
});

test('a stranger cannot scan or list matches on a subscription they do not own', async () => {
  const cookie = await signup();
  const created = await goal(cookie);
  const subscription = await request(
    `/objectives/${created.id}/goal/subscriptions`,
    { signalClasses: ['jobs'], attentionPolicy: 'digest' },
    cookie,
  );
  const stranger = await signup();
  assert.equal((await request(`/goal-subscriptions/${subscription.data.id}/scan`, {}, stranger, 'POST')).status, 404);
  assert.equal(
    (await request(`/goal-subscriptions/${subscription.data.id}/matches`, undefined, stranger, 'GET')).status,
    404,
  );
});
