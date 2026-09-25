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
  await store.db.close();
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
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get('set-cookie')?.split(';')[0],
  };
}
async function demo() {
  const result = await request('/auth/demo', {});
  assert.equal(result.status, 201);
  return result.cookie;
}

test('the full 248-tool catalog is public at /engines/catalog — the public-facing pages are where a user learns of everything', async () => {
  const result = await request('/engines/catalog', undefined, undefined, 'GET');
  assert.equal(result.status, 200);
  assert.equal(result.data.count, 248);
});

test('the in-app engine catalog requires a session', async () => {
  assert.equal((await request('/engines', undefined, undefined, 'GET')).status, 401);
});

test('running an engine still requires a session even though the public catalog does not', async () => {
  assert.equal((await request('/engines/f01/run', { input: {} })).status, 401);
});

test('an enterprise-tier workspace (the funded-test default) sees the full 248-tool catalog in-app', async () => {
  const cookie = await demo();
  const result = await request('/engines', undefined, cookie, 'GET');
  assert.equal(result.status, 200);
  assert.equal(result.data.count, 248);
  assert.ok(result.data.engines.every((e) => typeof e.pointsCost === 'number' && e.pointsCost > 0));
  assert.ok(result.data.engines.some((e) => e.code === 'F01' && e.homeEngine === 'Finance'));
  assert.ok(result.data.engines.some((e) => e.code === 'Q44' && e.kind === 'decision-quality'));
});

test("a workspace's in-app catalog is filtered to its signup context, cumulative by rank, and always includes what it's bought a bundle for", async () => {
  const cookie = await demo();
  const state = await request('/state', undefined, cookie, 'GET');
  const workspaceId = state.data.workspace.id;

  await store.db
    .prepare("UPDATE workspaces SET tier = 'individual', context = 'Individual' WHERE id = ?")
    .run(workspaceId);
  const individualView = await request('/engines', undefined, cookie, 'GET');
  assert.ok(individualView.data.count > 0);
  assert.ok(individualView.data.count < 248);
  // Clarity (S,Q) is the Individual-rank default; Finance (SME-rank) should not appear yet.
  assert.ok(individualView.data.engines.every((e) => e.homeEngine !== 'Finance'));

  await store.db.prepare("UPDATE workspaces SET context = 'Founder' WHERE id = ?").run(workspaceId);
  const founderView = await request('/engines', undefined, cookie, 'GET');
  assert.ok(founderView.data.count > individualView.data.count);
  assert.ok(founderView.data.engines.some((e) => e.homeEngine === 'Growth'));
  assert.ok(founderView.data.engines.every((e) => e.homeEngine !== 'Finance'));

  // Buying access to a Finance engine surfaces it in the catalog even though Founder < SME.
  await store.db
    .prepare("INSERT INTO workspace_agent_entitlements VALUES (?, 'f01', 'bundle:test', ?)")
    .run(workspaceId, new Date().toISOString());
  const withBundle = await request('/engines', undefined, cookie, 'GET');
  assert.ok(withBundle.data.engines.some((e) => e.code === 'F01'));
});

test('a financial-kind run returns arithmetically correct figures and appears on the public billables page', async () => {
  const cookie = await demo();
  const detail = await request('/engines/f01', undefined, cookie, 'GET');
  assert.equal(detail.status, 200);
  assert.equal(detail.data.inputs.kind, 'financial');

  const result = await request(
    '/engines/f01/run',
    {
      input: {
        currency: 'USD',
        periodLabel: 'Month',
        periods: [
          { revenue: 1000, cogs: 400, opex: 300 },
          { revenue: 1200, cogs: 450, opex: 320 },
        ],
        cashBalance: 5000,
        headcount: 4,
      },
    },
    cookie,
  );
  assert.equal(result.status, 200);
  assert.equal(result.data.pointsCharged, 35);
  // (1000+1200 revenue) - (400+450 cogs) = 1350 gross profit / 2200 revenue = 61.36%
  assert.equal(result.data.result.summary.grossMarginPct, 61.36);
  assert.equal(result.data.result.kind, 'financial');

  const billables = await request('/billables', undefined, undefined, 'GET');
  assert.equal(billables.status, 200);
  assert.ok(billables.data.tools.some((t) => t.id === 'f01'));
});

test('an assessment-kind run refuses a dimension the engine does not declare, without charging points', async () => {
  const cookie = await demo();
  const before = await request('/finance/points', undefined, cookie, 'GET');
  const result = await request(
    '/engines/s01/run',
    { input: { rows: [{ label: 'Not A Real Dimension', rating: 5 }] } },
    cookie,
  );
  assert.equal(result.status, 400);
  const after = await request('/finance/points', undefined, cookie, 'GET');
  assert.equal(after.data.balance, before.data.balance);
});

test("an assessment-kind run scores the module's own declared dimensions and charges points", async () => {
  const cookie = await demo();
  const detail = await request('/engines/s01', undefined, cookie, 'GET');
  const label = detail.data.dimensionLabels[0];
  const before = await request('/finance/points', undefined, cookie, 'GET');
  const result = await request(
    '/engines/s01/run',
    { input: { rows: [{ label, rating: 4, weight: 2, evidence: 1 }] } },
    cookie,
  );
  assert.equal(result.status, 200);
  assert.equal(result.data.pointsCharged, 35);
  const after = await request('/finance/points', undefined, cookie, 'GET');
  assert.equal(after.data.balance, before.data.balance - 35);
});

test('running an engine is rejected before charging when the workspace has too few points', async () => {
  const cookie = await demo();
  const state = await request('/state', undefined, cookie, 'GET');
  await store.db
    .prepare('UPDATE users SET points_balance = 10 WHERE id = ?')
    .run(state.data.user.id);
  const result = await request(
    '/engines/s01/run',
    { input: { rows: [{ label: 'Identity Clarity', rating: 4 }] } },
    cookie,
  );
  assert.equal(result.status, 402);
  const after = await request('/finance/points', undefined, cookie, 'GET');
  assert.equal(after.data.balance, 10);
});

test('an unknown engine code returns 404', async () => {
  const cookie = await demo();
  assert.equal((await request('/engines/zz99', undefined, cookie, 'GET')).status, 404);
  assert.equal((await request('/engines/zz99/run', { input: {} }, cookie)).status, 404);
});

test('F-TF-02: a syntactically valid but never-registered code (Z-series only goes to Z15) is rejected, not given a fabricated fallback config', async () => {
  // Z50 passes parseEngineCode's format check (letter + 2-3 digits) but Z-series only has
  // Z01-Z15 registered — this used to silently return buildFallbackConfig's generic config
  // instead of a 404, on the two public, unauthenticated routes.
  const detail = await request('/engines/Z50', undefined, undefined, 'GET');
  assert.equal(detail.status, 404);
  const demoRun = await request('/engines/Z50/demo-run', { input: {} }, undefined, 'POST');
  assert.equal(demoRun.status, 404);
});
