import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  runEngine,
  parseEngineCode,
  REGISTERED_CODES,
  describeEngine,
} from '../src/app/engines.mjs';

const run = (code, input) => runEngine(parseEngineCode(code), input);

test('dimensions left unrated are reported as unrated, not scored as 0', () => {
  const result = run('S01', {
    ratings: { 'Identity Clarity': { rating: 4, weight: 2, evidence: 2 } },
  });
  const { summary } = result;
  assert.equal(summary.indexPct, 80);
  assert.equal(summary.ratedCount, 1);
  assert.equal(summary.dimensionCount, 4);
  assert.deepEqual(summary.unrated, [
    'Strategic Alignment',
    'Reputation Index',
    'Market Recognition',
  ]);
  assert.equal(summary.weakest.label, 'Identity Clarity');
  assert.ok(!summary.priorities.some((p) => summary.unrated.includes(p)));
  assert.ok(
    summary.warnings.some((w) => w.includes('Only 1 of 4 dimensions')),
    JSON.stringify(summary.warnings),
  );
});

test('an explicit rating of 0 is a real rating, not a missing one', () => {
  const { summary } = run('S01', {
    ratings: {
      'Identity Clarity': { rating: 4, evidence: 2 },
      'Strategic Alignment': { rating: 0, evidence: 2 },
    },
  });
  assert.equal(summary.ratedCount, 2);
  assert.ok(!summary.unrated.includes('Strategic Alignment'));
  assert.equal(summary.weakest.label, 'Strategic Alignment');
});

test('a financial engine run without a period label falls back instead of crashing', () => {
  const result = run('F02', {
    periods: [
      { revenue: 1000, cogs: 400, opex: 900 },
      { revenue: 1000, cogs: 400, opex: 900 },
    ],
    cashBalance: 1000,
  });
  assert.equal(result.kind, 'financial');
  assert.ok(result.working.length > 0);
});

test('every registered engine states plainly what it calculates and what it does not', () => {
  for (const code of REGISTERED_CODES) {
    const about = describeEngine(parseEngineCode(code));
    assert.ok(about.computes.length > 20, `${code} has no computes statement`);
    assert.ok(about.limits.length > 20, `${code} has no limits statement`);
  }
});

test('finance and time-series engines disclose that they do not forecast or read live data', () => {
  assert.match(describeEngine(parseEngineCode('F02')).limits, /does not forecast/i);
  assert.match(describeEngine(parseEngineCode('F05')).limits, /does not value/i);
  assert.match(describeEngine(parseEngineCode('R11')).limits, /not connected to live data/i);
});

test('an engine run result carries the same disclosure the catalog shows', () => {
  const result = run('R25', { metric: 'weekly releases', values: [5, 4, 6, 2, 3] });
  assert.deepEqual(
    { computes: result.computes, limits: result.limits },
    describeEngine(parseEngineCode('R25')),
  );
});

test("an assessment's own warnings, including unrated coverage, reach the result the app displays", () => {
  const result = run('S01', { ratings: { 'Identity Clarity': { rating: 5 } } });
  assert.ok(
    result.warnings.some((w) => w.includes('Only 1 of 4 dimensions')),
    JSON.stringify(result.warnings),
  );
  assert.ok(result.warnings.some((w) => w.includes('rated 4 or above with no evidence')));
  assert.match(
    result.working,
    /Not rated: Strategic Alignment, Reputation Index, Market Recognition/,
  );
});
