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
    name: 'Outcome Owner',
    email: `outcome-attr-${counter}-${Date.now()}@example.test`,
    password: `a-long-outcome-password-${counter}`,
    context: 'Founder',
  });
  assert.equal(result.status, 201);
  return result.cookie;
}
async function goal(cookie, title = 'A goal to attribute outcomes to') {
  const created = await request(
    '/objectives',
    { title, description: '', context: 'Founder', priority: 'High', status: 'Active', targetDate: '', constraints: '', success: '' },
    cookie,
  );
  assert.equal(created.status, 201);
  return created.data;
}

test('an outcome can be recorded against a real subject with an honest attribution strength, and listed', async () => {
  const cookie = await signup();
  const created2 = await goal(cookie);
  const created = await request(
    '/outcome-records',
    { subjectKind: 'goal', subjectId: created2.id, description: 'Conversion rose after the redesign shipped.', attributionStrength: 'likely_contribution' },
    cookie,
  );
  assert.equal(created.status, 201);
  assert.equal(created.data.attribution_strength, 'likely_contribution');

  const listed = await request(`/outcome-records?subjectKind=goal&subjectId=${created2.id}`, undefined, cookie, 'GET');
  assert.equal(listed.status, 200);
  assert.equal(listed.data.length, 1);
});

test('an invalid attribution strength is rejected rather than silently defaulting to a stronger claim', async () => {
  const cookie = await signup();
  const created = await goal(cookie);
  const attempt = await request(
    '/outcome-records',
    { subjectKind: 'goal', subjectId: created.id, description: 'x', attributionStrength: 'definitely_caused_it' },
    cookie,
  );
  assert.equal(attempt.status, 400);
});

test('linking an outcome to a nonexistent recommendation in this workspace is rejected', async () => {
  const cookie = await signup();
  const created = await goal(cookie);
  const attempt = await request(
    '/outcome-records',
    {
      subjectKind: 'goal',
      subjectId: created.id,
      recommendationId: '00000000-0000-0000-0000-000000000000',
      description: 'x',
      attributionStrength: 'correlation',
    },
    cookie,
  );
  assert.equal(attempt.status, 404);
});

// SI-03: an outcome cannot be recorded against a subject that does not exist, and "verified_causal"
// cannot be asserted as bare caller input — it requires evidence (a completed recommendation).
test('an outcome cannot be recorded against a subject that does not exist in the workspace', async () => {
  const cookie = await signup();
  const attempt = await request(
    '/outcome-records',
    { subjectKind: 'goal', subjectId: '00000000-0000-0000-0000-000000000000', description: 'x', attributionStrength: 'correlation' },
    cookie,
  );
  assert.equal(attempt.status, 404);
});

test('a subject belonging to a different workspace cannot be attributed to', async () => {
  const cookie = await signup();
  const otherCookie = await signup();
  const otherGoal = await goal(otherCookie);
  const attempt = await request(
    '/outcome-records',
    { subjectKind: 'goal', subjectId: otherGoal.id, description: 'x', attributionStrength: 'correlation' },
    cookie,
  );
  assert.equal(attempt.status, 404);
});

test('"verified_causal" cannot be asserted as bare caller input, even against a real subject', async () => {
  const cookie = await signup();
  const created = await goal(cookie);
  const bareAssertion = await request(
    '/outcome-records',
    { subjectKind: 'goal', subjectId: created.id, description: 'This definitely caused it.', attributionStrength: 'verified_causal' },
    cookie,
  );
  assert.equal(bareAssertion.status, 400);
});

test('"verified_causal" is accepted once backed by a completed recommendation, but not a merely-proposed one', async () => {
  const cookie = await signup();
  const created = await goal(cookie);

  // Directly seed a recommendation for this subject via the recommendations API surface —
  // simulate an agent-created recommendation reaching completion.
  const recRow = await store.db
    .prepare('INSERT INTO recommendations VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id')
    .get(
      '11111111-1111-1111-1111-111111111111',
      (await request('/state', undefined, cookie, 'GET')).data.workspace.id,
      'goal',
      created.id,
      'goal-advisor',
      'Move to achieved',
      'All linked actions are done.',
      'recommended',
      null,
      new Date().toISOString(),
      new Date().toISOString(),
    );
  const recId = recRow.id;

  const stillProposed = await request(
    '/outcome-records',
    { subjectKind: 'goal', subjectId: created.id, recommendationId: recId, description: 'x', attributionStrength: 'verified_causal' },
    cookie,
  );
  assert.equal(stillProposed.status, 400, 'a merely-recommended (not completed) recommendation cannot back verified_causal');

  await store.db.prepare("UPDATE recommendations SET status = 'completed' WHERE id = ?").run(recId);

  const nowCompleted = await request(
    '/outcome-records',
    { subjectKind: 'goal', subjectId: created.id, recommendationId: recId, description: 'x', attributionStrength: 'verified_causal' },
    cookie,
  );
  assert.equal(nowCompleted.status, 201);
  assert.equal(nowCompleted.data.attribution_strength, 'verified_causal');
});
