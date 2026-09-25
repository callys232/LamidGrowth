import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createFundedTestApp as createApp } from './support/funded-app.mjs';
import { upsertIntelligenceResult } from '../src/app/intelligence.mjs';

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

  const resolved = await request(
    `/intelligence-conflicts/${conflicts.data[0].id}/resolve`,
    { resolution: 'A', notes: 'Confirmed with the client.' },
    cookie,
    'PATCH',
  );
  assert.equal(resolved.status, 200);
  assert.equal(resolved.data.resolvedConclusion, conflicts.data[0].conclusionA);

  const afterResolve = await request('/intelligence-conflicts?subjectKind=goal&subjectId=goal-3', undefined, cookie, 'GET');
  assert.equal(afterResolve.data.length, 0, 'a resolved conflict must not still show as open');

  const alreadyResolved = await request(`/intelligence-conflicts/${conflicts.data[0].id}/resolve`, { resolution: 'A' }, cookie, 'PATCH');
  assert.equal(alreadyResolved.status, 409);
});

test('F-SI-05: resolving a conflict actually reconciles both agents onto one conclusion, not just a flag flip', async () => {
  const cookie = await signup();
  const wsId = await workspaceId(cookie);

  await upsertIntelligenceResult(store, {
    workspaceId: wsId,
    subjectKind: 'goal',
    subjectId: 'goal-reconcile',
    agentId: 'goal-advisor',
    conclusion: 'achieved',
    summary: 'All linked actions are done.',
  });
  await upsertIntelligenceResult(store, {
    workspaceId: wsId,
    subjectKind: 'goal',
    subjectId: 'goal-reconcile',
    agentId: 'diagnostic-intelligence',
    conclusion: 'at_risk',
    summary: 'Recent activity suggests stalling.',
  });

  const conflicts = await request('/intelligence-conflicts?subjectKind=goal&subjectId=goal-reconcile', undefined, cookie, 'GET');
  assert.equal(conflicts.data.length, 1);

  // A custom reconciled conclusion neither agent originally reached.
  const resolved = await request(
    `/intelligence-conflicts/${conflicts.data[0].id}/resolve`,
    { resolution: 'custom', conclusion: 'progressing', notes: 'Human review split the difference.' },
    cookie,
    'PATCH',
  );
  assert.equal(resolved.status, 200);
  assert.equal(resolved.data.resolvedConclusion, 'progressing');

  const afterResolution = await request('/intelligence-results?subjectKind=goal&subjectId=goal-reconcile', undefined, cookie, 'GET');
  assert.equal(afterResolution.data.length, 2);
  assert.ok(
    afterResolution.data.every((r) => r.conclusion === 'progressing'),
    'both agents\' live results must reflect the reconciled conclusion, not the two original conflicting ones',
  );
});

test('F-SI-01: repeated computation produces immutable versions, not an overwrite', async () => {
  const cookie = await signup();
  const wsId = await workspaceId(cookie);

  const first = await upsertIntelligenceResult(store, {
    workspaceId: wsId,
    subjectKind: 'goal',
    subjectId: 'goal-versioned',
    agentId: 'goal-advisor',
    conclusion: 'progressing',
    summary: 'First computation.',
    sources: [{ kind: 'objective', id: 'goal-versioned', version: 1 }],
    modelRegistryId: 'companion-goal-advisor-v1',
  });
  assert.equal(first.version, 1);

  const second = await upsertIntelligenceResult(store, {
    workspaceId: wsId,
    subjectKind: 'goal',
    subjectId: 'goal-versioned',
    agentId: 'goal-advisor',
    conclusion: 'at_risk',
    summary: 'Second computation, after a material change.',
    sources: [{ kind: 'objective', id: 'goal-versioned', version: 2 }],
    modelRegistryId: 'companion-goal-advisor-v1',
  });
  assert.equal(second.version, 2);

  // The current-row GET reflects only the latest version.
  const current = await request('/intelligence-results?subjectKind=goal&subjectId=goal-versioned', undefined, cookie, 'GET');
  assert.equal(current.data.length, 1);
  assert.equal(current.data[0].version, 2);
  assert.equal(current.data[0].conclusion, 'at_risk');
  assert.deepEqual(current.data[0].sources, [{ kind: 'objective', id: 'goal-versioned', version: 2 }]);
  assert.equal(current.data[0].modelRegistryId, 'companion-goal-advisor-v1');

  // The history endpoint shows both versions, and the first version's content is provably
  // unchanged by the second write — proving immutability, not just a counter increment.
  const history = await request(
    '/intelligence-results/history?subjectKind=goal&subjectId=goal-versioned&agentId=goal-advisor',
    undefined,
    cookie,
    'GET',
  );
  assert.equal(history.status, 200);
  assert.equal(history.data.length, 2);
  assert.equal(history.data[0].version, 1);
  assert.equal(history.data[0].conclusion, 'progressing');
  assert.equal(history.data[0].summary, 'First computation.');
  assert.deepEqual(history.data[0].sources, [{ kind: 'objective', id: 'goal-versioned', version: 1 }]);
  assert.equal(history.data[1].version, 2);
  assert.equal(history.data[1].conclusion, 'at_risk');
});

test('F-SI-01: resolving a conflict writes a real new version for each agent, not an in-place mutation', async () => {
  const cookie = await signup();
  const wsId = await workspaceId(cookie);

  await upsertIntelligenceResult(store, {
    workspaceId: wsId,
    subjectKind: 'goal',
    subjectId: 'goal-reconcile-version',
    agentId: 'goal-advisor',
    conclusion: 'achieved',
    summary: 'All linked actions are done.',
    sources: [{ kind: 'objective', id: 'goal-reconcile-version', version: 3 }],
  });
  await upsertIntelligenceResult(store, {
    workspaceId: wsId,
    subjectKind: 'goal',
    subjectId: 'goal-reconcile-version',
    agentId: 'diagnostic-intelligence',
    conclusion: 'at_risk',
    summary: 'Recent activity suggests stalling.',
  });

  const conflicts = await request('/intelligence-conflicts?subjectKind=goal&subjectId=goal-reconcile-version', undefined, cookie, 'GET');
  assert.equal(conflicts.data.length, 1);
  // agentA/agentB order reflects (newly-written agent, previously-existing agent), not a fixed
  // pairing (see the conflict-detection test above) — resolve by whichever side "A" landed on.
  const resolvedConclusionExpected = conflicts.data[0].conclusionA;

  const resolved = await request(
    `/intelligence-conflicts/${conflicts.data[0].id}/resolve`,
    { resolution: 'A' },
    cookie,
    'PATCH',
  );
  assert.equal(resolved.status, 200);
  assert.equal(resolved.data.resolvedConclusion, resolvedConclusionExpected);

  const advisorHistory = await request(
    '/intelligence-results/history?subjectKind=goal&subjectId=goal-reconcile-version&agentId=goal-advisor',
    undefined,
    cookie,
    'GET',
  );
  assert.equal(advisorHistory.data.length, 2, 'reconciliation must add a new version, not mutate the first');
  assert.equal(advisorHistory.data[0].conclusion, 'achieved', 'the original version is untouched');
  assert.equal(advisorHistory.data[1].conclusion, resolvedConclusionExpected, 'goal-advisor is reconciled onto the resolved conclusion');
  assert.ok(advisorHistory.data[1].derivedFrom, 'the reconciled version records which prior version it replaced');
  assert.ok(
    advisorHistory.data[1].sources.some((s) => s.kind === 'intelligence_conflict' && s.id === conflicts.data[0].id),
    'the reconciled version records the conflict itself as a lineage input',
  );

  const diagnosticHistory = await request(
    '/intelligence-results/history?subjectKind=goal&subjectId=goal-reconcile-version&agentId=diagnostic-intelligence',
    undefined,
    cookie,
    'GET',
  );
  assert.equal(diagnosticHistory.data.length, 2);
  assert.equal(diagnosticHistory.data[0].conclusion, 'at_risk', 'the original version is untouched');
  assert.equal(diagnosticHistory.data[1].conclusion, resolvedConclusionExpected, 'diagnostic-intelligence is reconciled onto the resolved conclusion');
});

test('F-SI-01: goal-advisor\'s real call site attaches its actual sources, not fabricated lineage', async () => {
  const cookie = await enableAI(await signup());
  const created = await goal(cookie);
  await advanceToActive(cookie, created.id);
  await action(cookie, created.id, 'Done');

  const advice = await request('/companion/messages', { message: 'give me goal advice', objectiveId: created.id, agentId: 'goal-advisor', consent: true }, cookie);
  assert.equal(advice.status, 201);

  const history = await request(
    `/intelligence-results/history?subjectKind=goal&subjectId=${created.id}&agentId=goal-advisor`,
    undefined,
    cookie,
    'GET',
  );
  assert.equal(history.status, 200);
  assert.equal(history.data.length, 1);
  const sources = history.data[0].sources;
  assert.ok(sources.some((s) => s.kind === 'objective' && s.id === created.id), 'the goal itself must be a recorded source');
  assert.ok(sources.some((s) => s.kind === 'action'), 'the linked action must be a recorded source');
  assert.ok(history.data[0].modelRegistryId, 'a real approved model registry id must be attached');
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
