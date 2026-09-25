import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
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
async function request(path, body, cookie, method, extraHeaders = {}) {
  const verb = method || (body === undefined ? 'GET' : 'POST');
  const response = await fetch(`${base}/api${path}`, {
    method: verb,
    headers: {
      ...(['GET', 'HEAD', 'OPTIONS'].includes(verb) ? {} : { 'Content-Type': 'application/json' }),
      ...(cookie ? { Cookie: cookie } : {}),
      ...extraHeaders,
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
    name: 'Connector Owner',
    email: `connector-${counter}-${Date.now()}@example.test`,
    password: `a-long-connector-password-${counter}`,
    context: 'Founder',
  });
  assert.equal(result.status, 201);
  return result.cookie;
}

test('F-CORE-01: a connector is registered, its secret is shown once, and never returned again', async () => {
  const cookie = await signup();
  const created = await request('/connectors', { name: 'Slack notifications', type: 'webhook' }, cookie);
  assert.equal(created.status, 201);
  assert.ok(created.data.secret, 'the secret is returned exactly once, on creation');
  assert.equal(created.data.hasSecret, true);

  const listed = await request('/connectors', undefined, cookie, 'GET');
  assert.equal(listed.status, 200);
  assert.equal(listed.data.length, 1);
  assert.equal(listed.data[0].secret, undefined, 'the secret must never be returned again');
  assert.equal(listed.data[0].hasSecret, true);

  const manual = await request('/connectors', { name: 'Manual CRM sync', type: 'manual' }, cookie);
  assert.equal(manual.status, 201);
  assert.equal(manual.data.secret, null, 'a manual connector has no signing secret');

  const stranger = await signup();
  assert.equal((await request('/connectors', undefined, stranger, 'GET')).data.length, 0, 'connectors are workspace-scoped');
});

test('F-CORE-01: connector grants can be added and revoked, and a grant cannot be revoked twice', async () => {
  const cookie = await signup();
  const connector = await request('/connectors', { name: 'CRM', type: 'manual' }, cookie);
  const grant = await request(`/connectors/${connector.data.id}/grants`, { scope: 'contacts:read' }, cookie);
  assert.equal(grant.status, 201);
  assert.equal(grant.data.revoked_at, null);

  const listed = await request(`/connectors/${connector.data.id}/grants`, undefined, cookie, 'GET');
  assert.equal(listed.data.length, 1);

  const revoked = await request(`/connectors/${connector.data.id}/grants/${grant.data.id}`, {}, cookie, 'DELETE');
  assert.equal(revoked.status, 200);

  const revokedAgain = await request(`/connectors/${connector.data.id}/grants/${grant.data.id}`, {}, cookie, 'DELETE');
  assert.equal(revokedAgain.status, 409);
});

test('F-CORE-01: a webhook connector accepts a correctly signed payload and rejects a forged one', async () => {
  const cookie = await signup();
  const created = await request('/connectors', { name: 'Inbound sync', type: 'webhook' }, cookie);
  const secret = created.data.secret;
  const payload = { event: 'contact.created', id: 'ext-123' };
  const body = JSON.stringify(payload);
  const validSignature = createHmac('sha256', secret).update(body).digest('hex');

  const forged = await request(`/connectors/${created.data.id}/webhook`, payload, undefined, 'POST', {
    'X-Signature': 'a'.repeat(64),
  });
  assert.equal(forged.status, 401);

  const valid = await request(`/connectors/${created.data.id}/webhook`, payload, undefined, 'POST', {
    'X-Signature': validSignature,
  });
  assert.equal(valid.status, 200, JSON.stringify(valid.data));

  const status = await request('/connectors', undefined, cookie, 'GET');
  const updated = status.data.find((c) => c.id === created.data.id);
  assert.equal(updated.status, 'connected');
  assert.ok(updated.last_sync_at);

  // A manual connector (no secret) always 404s on the webhook route.
  const manual = await request('/connectors', { name: 'Manual', type: 'manual' }, cookie);
  const manualAttempt = await request(`/connectors/${manual.data.id}/webhook`, {}, undefined, 'POST', {
    'X-Signature': 'a'.repeat(64),
  });
  assert.equal(manualAttempt.status, 404);
});

test('F-CORE-01: a real domain event (goal stage change) is emitted and readable through cursor-paginated /events', async () => {
  const cookie = await signup();
  const objective = await request(
    '/objectives',
    { title: 'Ship the feature', description: '', context: 'Founder', priority: 'High', status: 'Active', targetDate: '', constraints: '', success: '' },
    cookie,
  );
  assert.equal(objective.status, 201);

  const before = await request('/events', undefined, cookie, 'GET');
  assert.equal(before.status, 200);
  const cursor = before.data.length ? Math.max(...before.data.map((e) => e.seq)) : 0;

  for (const stage of ['clarified', 'baseline_established', 'path_defined', 'active']) {
    const r = await request(`/objectives/${objective.data.id}/goal/stage`, { stage }, cookie, 'PATCH');
    assert.equal(r.status, 200, JSON.stringify(r.data));
  }

  const afterFull = await request('/events', undefined, cookie, 'GET');
  const stageEvents = afterFull.data.filter((e) => e.eventType === 'goal.stage_changed' && e.payload.goalId === objective.data.id);
  assert.equal(stageEvents.length, 4);

  const sinceCursor = await request(`/events?since=${cursor}`, undefined, cookie, 'GET');
  assert.equal(
    sinceCursor.data.filter((e) => e.eventType === 'goal.stage_changed' && e.payload.goalId === objective.data.id).length,
    4,
    'since= excludes nothing new, and a fresh call with the latest seq excludes everything already seen',
  );
  const newCursor = Math.max(...sinceCursor.data.map((e) => e.seq));
  const seenAgain = await request(`/events?since=${newCursor}`, undefined, cookie, 'GET');
  assert.equal(
    seenAgain.data.filter((e) => e.payload.goalId === objective.data.id).length,
    0,
    'already-seen events must not be returned again for the same cursor',
  );

  const stranger = await signup();
  const strangerEvents = await request('/events', undefined, stranger, 'GET');
  assert.equal(
    strangerEvents.data.filter((e) => e.payload.goalId === objective.data.id).length,
    0,
    'events are workspace-scoped',
  );
});
