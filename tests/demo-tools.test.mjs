import test from 'node:test';
import assert from 'node:assert/strict';
import { demoToolCatalog } from '../src/app/demoAccess.mjs';
import { demoEngineDetail, resolve, runEngine } from '../src/app/engines.mjs';
import { PLANS } from '../src/app/plans.mjs';
import express from 'express';
import { createHash } from 'node:crypto';
import { mountDemoAccess } from '../src/app/demoAccess.mjs';

for (const tier of ['individual', 'team', 'enterprise']) {
  test(`${tier} demo includes and runs every tool in its plan`, () => {
    const catalog = demoToolCatalog(tier);
    const plan = PLANS[tier === 'individual' ? 'personal' : tier];
    assert.ok(catalog.engines.length > 0);
    for (const engine of catalog.engines) {
      assert.ok(plan.seats.includes(engine.homeEngine), engine.code);
      const detail = demoEngineDetail(engine.code);
      assert.ok(detail.inputs, `Manifest missing for ${engine.code}`);
      assert.ok(detail.example, `Example missing for ${engine.code}`);
      const result = runEngine(resolve(engine.code).ref, detail.example);
      assert.ok(result.summary, `No result for ${engine.code}`);
    }
    for (const engine of catalog.locked) assert.ok(!plan.seats.includes(engine.homeEngine));
  });
}

test('demo tool endpoints verify access, enforce the selected tier, and charge no points', async (t) => {
  const token = 'a'.repeat(64);
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const store = {
    db: {
      prepare(sql) {
        return {
          async get(value) {
            if (sql.includes('FROM demo_sessions'))
              return value === tokenHash ? { id: 'demo-visitor', verified_at: 1 } : undefined;
            if (sql.includes('rate_limit_buckets'))
              return { count: 1, reset_at: Date.now() + 60000 };
            throw new Error('Unexpected database query');
          },
        };
      },
    },
    transaction: async (fn) => fn(),
  };
  const app = express();
  app.use(express.json());
  mountDemoAccess(app, store, {
    key: Buffer.alloc(32),
    provider: null,
    origin: 'https://example.test',
    production: false,
  });
  app.use((error, _req, res, _next) =>
    res.status(error.status || 400).json({ error: error.message }),
  );
  const server = await new Promise((resolve) => {
    const value = app.listen(0, '127.0.0.1', () => resolve(value));
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  async function post(path, body) {
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/api/demo/engines/${path}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
    return { status: response.status, data: await response.json() };
  }
  assert.equal((await post('catalog', { token: 'b'.repeat(64), tier: 'team' })).status, 401);
  const personal = demoToolCatalog('individual');
  const excluded = personal.locked[0];
  assert.ok(excluded);
  assert.equal(
    (await post('detail', { token, tier: 'individual', code: excluded.code })).status,
    403,
  );
  assert.equal(
    (await post('run', { token, tier: 'individual', code: excluded.code, input: {} })).status,
    403,
  );
  const detail = demoEngineDetail(excluded.code);
  const run = await post('run', {
    token,
    tier: 'team',
    code: excluded.code,
    input: detail.example,
  });
  assert.equal(run.status, 200);
  assert.equal(run.data.pointsCharged, 0);
  assert.ok(run.data.result.summary);
});
