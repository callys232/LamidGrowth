import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createFundedTestApp as createApp } from './support/funded-app.mjs';

// The /demo "See it in motion" player animates four tool results from saved samples. Each must be
// what the real engine computes for its input — this re-runs them and fails if any drift.
const samples = JSON.parse(
  await readFile(
    new URL('../src/products/website/pages/demo/demoVideos/demoVideoSamples.json', import.meta.url),
    'utf8',
  ),
);

/** The engine fields each video shows. */
const PICK = {
  S01: (s) => ({
    overallPct: s.overallPct,
    maturityLabel: s.maturityLabel,
    weakestArea: s.weakestArea,
    sections: s.sections.map(({ label, scorePct }) => ({ label, scorePct })),
  }),
  F01: (s) => ({
    currency: s.currency,
    grossMarginPct: s.grossMarginPct,
    operatingMarginPct: s.operatingMarginPct,
    revenueGrowthPct: s.revenueGrowthPct,
    revenuePerHead: s.revenuePerHead,
    periods: s.periodsDerived.map(({ revenue, grossMarginPct, operatingMarginPct }) => ({
      revenue,
      grossMarginPct,
      operatingMarginPct,
    })),
  }),
  Q21: (s) => ({
    ranked: s.ranked.map(({ name, totalPct }) => ({ name, totalPct })),
    winner: s.winner.name,
    sensitivity: s.sensitivity.map(
      ({ name, currentWeightPct, flipDistancePct, flipsTo, direction }) => ({
        name,
        currentWeightPct,
        flipDistancePct,
        flipsTo,
        direction,
      }),
    ),
  }),
  R25: (s) => ({
    roots: s.roots.map(({ chain, root, evidence, category }) => ({
      chain,
      root,
      evidence,
      category,
    })),
    mostProbable: s.mostProbable,
    categoriesNotConsidered: s.categoriesNotConsidered,
  }),
};

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

for (const code of Object.keys(PICK)) {
  test(`the /demo ${code} video sample matches what the engine computes`, async () => {
    const response = await fetch(`${base}/api/engines/${code}/demo-run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: samples[code].input }),
    });
    assert.equal(response.status, 200);
    const { result } = await response.json();
    assert.equal(result.status, 'completed');
    assert.deepEqual(PICK[code](result.summary), samples[code].result);
  });
}
