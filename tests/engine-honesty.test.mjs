import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  runEngine,
  parseEngineCode,
  REGISTERED_CODES,
  describeEngine,
} from '../src/app/engines.mjs';

const run = (code, input) => runEngine(parseEngineCode(code), input);

// S01 is now Purpose & Strategic Direction, an anchored questionnaire (see toolCatalog/anchored.mjs).
test('questions left unanswered are reported as unanswered, not scored as 0', () => {
  const { summary, warnings } = run('S01', { answers: { p1: { level: 4, evidence: 2 } } });
  // One answer of six is too little for an overall score; the answered area is still scored.
  assert.equal(summary.overallPct, null);
  assert.equal(summary.sections[0].scorePct, 80);
  assert.equal(summary.sections[0].answered, 1);
  assert.equal(summary.sections[1].scorePct, null);
  assert.equal(summary.unanswered.length, 5);
  assert.ok(
    warnings.some((w) => w.includes('5 of 6 questions unanswered')),
    JSON.stringify(warnings),
  );
});

test('an explicit answer of 0 is a real answer, not a missing one', () => {
  const { summary } = run('S01', {
    answers: { p1: { level: 4, evidence: 2 }, p3: { level: 0, evidence: 2 } },
  });
  assert.equal(summary.sections[1].scorePct, 0);
  assert.equal(summary.weakestArea, 'Strategic direction');
  assert.equal(summary.unanswered.length, 4);
});

test('a financial engine run without a period label falls back instead of crashing', () => {
  const result = run('F01', {
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

test('finance, valuation and metric tools disclose that they do not forecast, value formally or read live data', () => {
  assert.match(describeEngine(parseEngineCode('F01')).limits, /does not forecast/i);
  assert.match(describeEngine(parseEngineCode('F05')).limits, /not a formal valuation opinion/i);
  assert.match(describeEngine(parseEngineCode('R02')).limits, /not connected/i);
  assert.match(describeEngine(parseEngineCode('R03')).limits, /not why/i);
});

test('an engine run result carries the same disclosure the catalog shows', () => {
  const result = run('R03', {
    metric: 'weekly releases',
    values: [5, 4, 6, 2, 3, 5, 4, 6].map((value) => ({ value })),
  });
  assert.deepEqual(
    { computes: result.computes, limits: result.limits },
    describeEngine(parseEngineCode('R03')),
  );
});

test("a questionnaire's own warnings, including unanswered coverage and unevidenced highs, reach the result", () => {
  const result = run('S01', { answers: { p1: { level: 5, evidence: 0 } } });
  assert.ok(
    result.warnings.some((w) => w.includes('unanswered')),
    JSON.stringify(result.warnings),
  );
  assert.ok(result.warnings.some((w) => w.includes('Rated 4 or 5 with no evidence')));
  assert.match(result.working, /Purpose, vision and values: 80%/);
});
