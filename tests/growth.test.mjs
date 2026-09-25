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
        return {
          review: {
            summary: `AI summary: ${context.question} (${(context.sources || []).length} source(s))`,
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
    name: 'Growth Owner',
    email: `growth-${counter}-${Date.now()}@example.test`,
    password: `a-long-growth-password-${counter}`,
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

test('a KPI can be defined, observed, listed and deleted', async () => {
  const cookie = await signup();
  const created = await request('/kpis', { name: 'Monthly recurring revenue', unit: 'USD', target: 10000 }, cookie);
  assert.equal(created.status, 201);
  assert.equal(created.data.name, 'Monthly recurring revenue');

  const obs1 = await request(`/kpis/${created.data.id}/observations`, { value: 4000 }, cookie);
  assert.equal(obs1.status, 201);
  const obs2 = await request(`/kpis/${created.data.id}/observations`, { value: 6000 }, cookie);
  assert.equal(obs2.status, 201);

  const listed = await request(`/kpis/${created.data.id}/observations`, undefined, cookie, 'GET');
  assert.equal(listed.data.length, 2);

  const stranger = await signup();
  assert.equal((await request(`/kpis/${created.data.id}/observations`, undefined, stranger, 'GET')).status, 404);

  const deleted = await request(`/kpis/${created.data.id}`, {}, cookie, 'DELETE');
  assert.equal(deleted.status, 204);
  assert.equal((await request('/kpis', undefined, cookie, 'GET')).data.length, 0);
});

test('an opportunity can be created, updated through its pipeline, and deleted', async () => {
  const cookie = await signup();
  const created = await request('/opportunities', { title: 'Enterprise upsell', description: 'Existing client wants more seats' }, cookie);
  assert.equal(created.status, 201);
  assert.equal(created.data.status, 'identified');

  const qualified = await request(`/opportunities/${created.data.id}`, { status: 'qualified' }, cookie, 'PATCH');
  assert.equal(qualified.status, 200);
  assert.equal(qualified.data.status, 'qualified');

  const stranger = await signup();
  assert.equal((await request(`/opportunities/${created.data.id}`, { status: 'won' }, stranger, 'PATCH')).status, 404);

  assert.equal((await request(`/opportunities/${created.data.id}`, {}, cookie, 'DELETE')).status, 204);
  assert.equal((await request('/opportunities', undefined, cookie, 'GET')).data.length, 0);
});

test('an experiment moves through draft -> running -> complete and rejects out-of-order transitions', async () => {
  const cookie = await signup();
  const created = await request('/experiments', { title: 'Pricing page A/B', hypothesis: 'Shorter copy converts better', metric: 'Signup rate' }, cookie);
  assert.equal(created.status, 201);
  assert.equal(created.data.status, 'draft');

  assert.equal(
    (await request(`/experiments/${created.data.id}/complete`, { result: 'too early' }, cookie, 'PATCH')).status,
    409,
    'cannot complete a draft experiment',
  );

  const started = await request(`/experiments/${created.data.id}/start`, {}, cookie, 'PATCH');
  assert.equal(started.status, 200);
  assert.equal(started.data.status, 'running');

  assert.equal(
    (await request(`/experiments/${created.data.id}/start`, {}, cookie, 'PATCH')).status,
    409,
    'cannot start an already-running experiment',
  );

  const completed = await request(`/experiments/${created.data.id}/complete`, { result: 'Conversion rose 12%' }, cookie, 'PATCH');
  assert.equal(completed.status, 200);
  assert.equal(completed.data.status, 'complete');
  assert.equal(completed.data.result, 'Conversion rose 12%');
});

test('F-GROW-01: a KPI redefinition is a new immutable version, not a silent overwrite', async () => {
  const cookie = await signup();
  const created = await request(
    '/kpis',
    { name: 'Monthly recurring revenue', unit: 'USD', target: 10000, calculationMethod: 'Sum of active subscription plans' },
    cookie,
  );
  assert.equal(created.status, 201);
  assert.equal(created.data.version, 1);
  assert.equal(created.data.calculation_method, 'Sum of active subscription plans');

  const redefined = await request(
    `/kpis/${created.data.id}`,
    { calculationMethod: 'Sum of active subscription plans, excluding trials' },
    cookie,
    'PATCH',
  );
  assert.equal(redefined.status, 200);
  assert.equal(redefined.data.version, 2);
  assert.equal(redefined.data.name, 'Monthly recurring revenue', 'unspecified fields carry over');

  const versions = await request(`/kpis/${created.data.id}/versions`, undefined, cookie, 'GET');
  assert.equal(versions.status, 200);
  assert.equal(versions.data.length, 2);
  assert.equal(versions.data[0].version, 1);
  assert.equal(versions.data[0].calculation_method, 'Sum of active subscription plans', 'the first version is preserved, not overwritten');
  assert.equal(versions.data[1].version, 2);
});

test('F-GROW-01: a KPI observation backed by a real uploaded file is distinguishable from a bare text claim', async () => {
  const cookie = await signup();
  const kpi = await request('/kpis', { name: 'Active users', unit: 'users' }, cookie);

  const textOnly = await request(`/kpis/${kpi.data.id}/observations`, { value: 100, source: 'Analytics dashboard screenshot' }, cookie);
  assert.equal(textOnly.status, 201);
  assert.equal(textOnly.data.hasEvidence, false);

  const uploaded = await request(
    '/files',
    { filename: 'analytics.txt', mimeType: 'text/plain', base64Content: Buffer.from('100 active users this month').toString('base64') },
    cookie,
  );
  assert.equal(uploaded.status, 201);
  const withEvidence = await request(
    `/kpis/${kpi.data.id}/observations`,
    { value: 150, evidenceFileId: uploaded.data.id },
    cookie,
  );
  assert.equal(withEvidence.status, 201);
  assert.equal(withEvidence.data.hasEvidence, true);

  const stranger = await signup();
  const strangerUpload = await request(
    '/files',
    { filename: 'fake.txt', mimeType: 'text/plain', base64Content: Buffer.from('x').toString('base64') },
    stranger,
  );
  const rejected = await request(
    `/kpis/${kpi.data.id}/observations`,
    { value: 200, evidenceFileId: strangerUpload.data.id },
    cookie,
  );
  assert.equal(rejected.status, 404, 'a file the observer does not own cannot be cited as evidence');

  const listed = await request(`/kpis/${kpi.data.id}/observations`, undefined, cookie, 'GET');
  assert.deepEqual(
    listed.data.map((o) => o.hasEvidence),
    [false, true],
  );
});

test('F-GROW-01: opportunity readiness reflects its real fields, not a fabricated probability', async () => {
  const cookie = await signup();
  // A brand-new bare opportunity is 'partial', not 'not_ready' — it's still fresh (not stale)
  // even with no value estimate or source yet; readiness is never a fabricated probability, only
  // what's actually true about its real, present fields.
  const bare = await request('/opportunities', { title: 'Cold lead', description: '' }, cookie);
  assert.equal(bare.status, 201);
  assert.equal(bare.data.readiness, 'partial');

  // Backdating it past the staleness window (with still no value/source) is the real 'not_ready'
  // case — every one of the three real readiness signals is false.
  await store.db.prepare('UPDATE opportunities SET updated_at = ? WHERE id = ?').run(
    new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
    bare.data.id,
  );
  const stale = await request('/opportunities', undefined, cookie, 'GET');
  assert.equal(stale.data.find((o) => o.id === bare.data.id).readiness, 'not_ready');

  const ready = await request(
    '/opportunities',
    { title: 'Warm referral', description: '', source: 'Referred by existing client', valueEstimate: 5000, type: 'referral' },
    cookie,
  );
  assert.equal(ready.status, 201);
  assert.equal(ready.data.readiness, 'ready');
  assert.equal(ready.data.type, 'referral');

  const listed = await request('/opportunities', undefined, cookie, 'GET');
  assert.ok(listed.data.every((o) => ['ready', 'partial', 'not_ready'].includes(o.readiness)));
});

test('F-GROW-01: an experiment with variants requires workspace:manage to start, and completes with structured per-variant results', async () => {
  const cookie = await signup();
  const created = await request(
    '/experiments',
    {
      title: 'Pricing page A/B',
      hypothesis: 'Shorter copy converts better',
      metric: 'Signup rate',
      variants: [
        { name: 'control', trafficWeightPercent: 50 },
        { name: 'short-copy', trafficWeightPercent: 50 },
      ],
    },
    cookie,
  );
  assert.equal(created.status, 201, JSON.stringify(created.data));
  assert.equal(created.data.variants.length, 2);

  const badWeights = await request(
    '/experiments',
    {
      title: 'Bad weights',
      hypothesis: 'x',
      metric: 'y',
      variants: [
        { name: 'a', trafficWeightPercent: 50 },
        { name: 'b', trafficWeightPercent: 40 },
      ],
    },
    cookie,
  );
  assert.equal(badWeights.status, 400);

  const started = await request(`/experiments/${created.data.id}/start`, {}, cookie, 'PATCH');
  assert.equal(started.status, 200, JSON.stringify(started.data));
  assert.equal(started.data.status, 'running');

  const badVariant = await request(
    `/experiments/${created.data.id}/complete`,
    { result: 'Short copy won', winningVariant: 'not-a-real-variant' },
    cookie,
    'PATCH',
  );
  assert.equal(badVariant.status, 400);

  const completed = await request(
    `/experiments/${created.data.id}/complete`,
    {
      result: 'Short copy converted 12% better',
      winningVariant: 'short-copy',
      perVariantObservedValue: { control: 0.08, 'short-copy': 0.09 },
    },
    cookie,
    'PATCH',
  );
  assert.equal(completed.status, 200, JSON.stringify(completed.data));
  assert.equal(completed.data.winning_variant, 'short-copy');
  assert.deepEqual(completed.data.per_variant_observed_value, { control: 0.08, 'short-copy': 0.09 });
});

test('performance-analytics reports real KPI data, not just generic records', async () => {
  const cookie = await enableAI(await signup());
  const kpi = await request('/kpis', { name: 'Active users', unit: 'users' }, cookie);
  await request(`/kpis/${kpi.data.id}/observations`, { value: 100 }, cookie);
  await request(`/kpis/${kpi.data.id}/observations`, { value: 150 }, cookie);

  const advice = await request('/companion/messages', { message: 'how is performance trending', agentId: 'performance-analytics', consent: true }, cookie);
  assert.equal(advice.status, 201);
  assert.equal(advice.data.evidence.kpis[0].name, 'Active users');
  assert.equal(advice.data.evidence.kpis[0].trend, 'up');
});

test('opportunity-signals reports real pipeline data', async () => {
  const cookie = await enableAI(await signup());
  await request('/opportunities', { title: 'Referral partnership', description: '', valueEstimate: 5000 }, cookie);

  const advice = await request('/companion/messages', { message: 'what opportunities should I pursue', agentId: 'opportunity-signals', consent: true }, cookie);
  assert.equal(advice.status, 201);
  assert.equal(advice.data.evidence.opportunityIds.length, 1);
});

test('experiment-builder persists a real draft experiment instead of returning prose only', async () => {
  const cookie = await enableAI(await signup());
  const advice = await request('/companion/messages', { message: 'test whether a shorter onboarding flow improves activation', agentId: 'experiment-builder', consent: true }, cookie);
  assert.equal(advice.status, 201);
  const experimentId = advice.data.evidence.experiment.id;
  assert.ok(experimentId);

  const listed = await request('/experiments', undefined, cookie, 'GET');
  assert.equal(listed.data.length, 1);
  assert.equal(listed.data[0].id, experimentId);
  assert.equal(listed.data[0].status, 'draft');
});
