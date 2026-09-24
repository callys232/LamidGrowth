import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createFundedTestApp as createApp } from './support/funded-app.mjs';
import { upsertIntelligenceResult } from '../src/app/intelligence.mjs';

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
    name: 'Intel Owner',
    email: `intel-${counter}-${Date.now()}@example.test`,
    password: `a-long-intel-password-${counter}`,
    context: 'Founder',
  });
  assert.equal(result.status, 201);
  return result.cookie;
}
async function workspaceId(cookie) {
  const state = (await request('/state', undefined, cookie, 'GET')).data;
  return state.workspace.id;
}

test('a fresh intelligence result is readable by another engine, and an expired one is not', async () => {
  const cookie = await signup();
  const wsId = await workspaceId(cookie);

  await upsertIntelligenceResult(store, {
    workspaceId: wsId,
    subjectKind: 'goal',
    subjectId: 'goal-1',
    agentId: 'goal-advisor',
    conclusion: 'progressing',
    summary: 'On track.',
    ttlSeconds: 3600,
  });

  const fresh = await request('/intelligence-results?subjectKind=goal&subjectId=goal-1', undefined, cookie, 'GET');
  assert.equal(fresh.status, 200);
  assert.equal(fresh.data.length, 1);
  assert.equal(fresh.data[0].conclusion, 'progressing');

  await upsertIntelligenceResult(store, {
    workspaceId: wsId,
    subjectKind: 'goal',
    subjectId: 'goal-2',
    agentId: 'goal-advisor',
    conclusion: 'blocked',
    summary: 'Stuck.',
    ttlSeconds: -1,
  });
  const expired = await request('/intelligence-results?subjectKind=goal&subjectId=goal-2', undefined, cookie, 'GET');
  assert.equal(expired.data.length, 0, 'an expired result must not be served as current');
});

test('two agents reaching different conclusions about the same subject raises a conflict for a human to resolve', async () => {
  const cookie = await signup();
  const wsId = await workspaceId(cookie);

  await upsertIntelligenceResult(store, {
    workspaceId: wsId,
    subjectKind: 'goal',
    subjectId: 'goal-3',
    agentId: 'goal-advisor',
    conclusion: 'achieved',
    summary: 'All linked actions are done.',
  });
  const second = await upsertIntelligenceResult(store, {
    workspaceId: wsId,
    subjectKind: 'goal',
    subjectId: 'goal-3',
    agentId: 'diagnostic-intelligence',
    conclusion: 'at_risk',
    summary: 'Recent activity suggests stalling.',
  });
  assert.equal(second.conflictsRaised, 1);

  const conflicts = await request('/intelligence-conflicts?subjectKind=goal&subjectId=goal-3', undefined, cookie, 'GET');
  assert.equal(conflicts.status, 200);
  assert.equal(conflicts.data.length, 1);
  // agentA/agentB order reflects (newly-written agent, previously-existing agent), not a fixed
  // pairing, so assert the unordered set of participants instead of a specific slot each occupies.
  assert.deepEqual(
    new Set([conflicts.data[0].agentA, conflicts.data[0].agentB]),
    new Set(['goal-advisor', 'diagnostic-intelligence']),
  );

  // Agreeing again must not raise a second conflict for the same unresolved pair.
  const third = await upsertIntelligenceResult(store, {
    workspaceId: wsId,
    subjectKind: 'goal',
    subjectId: 'goal-3',
    agentId: 'diagnostic-intelligence',
    conclusion: 'blocked',
    summary: 'Still stalling.',
  });
  assert.equal(third.conflictsRaised, 0, 'the same unresolved pair must not duplicate a conflict entry');

  const resolved = await request(`/intelligence-conflicts/${conflicts.data[0].id}/resolve`, { notes: 'Confirmed with the client.' }, cookie, 'PATCH');
  assert.equal(resolved.status, 200);

  const afterResolve = await request('/intelligence-conflicts?subjectKind=goal&subjectId=goal-3', undefined, cookie, 'GET');
  assert.equal(afterResolve.data.length, 0, 'a resolved conflict must not still show as open');

  const alreadyResolved = await request(`/intelligence-conflicts/${conflicts.data[0].id}/resolve`, {}, cookie, 'PATCH');
  assert.equal(alreadyResolved.status, 409);
});

test('a stranger cannot read or resolve another workspace\'s intelligence results', async () => {
  const cookie = await signup();
  const wsId = await workspaceId(cookie);
  await upsertIntelligenceResult(store, {
    workspaceId: wsId,
    subjectKind: 'goal',
    subjectId: 'goal-private',
    agentId: 'goal-advisor',
    conclusion: 'progressing',
    summary: 'Private.',
  });
  const stranger = await signup();
  const strangerRead = await request('/intelligence-results?subjectKind=goal&subjectId=goal-private', undefined, stranger, 'GET');
  assert.equal(strangerRead.status, 200);
  assert.equal(strangerRead.data.length, 0, 'a workspace only sees its own intelligence results');
});
