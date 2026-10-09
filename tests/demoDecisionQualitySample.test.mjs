import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createFundedTestApp as createApp } from './support/funded-app.mjs';

// The /demo hero animates a Decision Quality result from a saved sample. That sample must be what
// the real engine actually computes for its input — this re-runs it and fails if the two drift.
const sample = JSON.parse(
  await readFile(
    new URL('../src/products/website/pages/demo/decisionQualitySample.json', import.meta.url),
    'utf8',
  ),
);

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

test('the /demo Decision Quality sample matches what the engine computes', async () => {
  const response = await fetch(`${base}/api/engines/Q44/demo-run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: sample.input }),
  });
  assert.equal(response.status, 200);
  const { result } = await response.json();
  const s = result.summary;

  assert.equal(s.overallPct, sample.result.overallPct);
  assert.equal(s.requiredPct, sample.result.requiredPct);
  assert.equal(s.verdict, sample.result.verdict);
  assert.equal(s.headline, sample.result.headline);
  assert.deepEqual(
    s.requirements.map(({ id, label, scorePct, blocking }) => ({ id, label, scorePct, blocking })),
    sample.result.requirements,
  );
  assert.deepEqual(s.nextActions[0], sample.result.nextAction);
});
