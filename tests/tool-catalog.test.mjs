import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  runEngine,
  parseEngineCode,
  describeEngine,
  toolFor,
  CATALOG_CODES,
  REGISTERED_CODES,
  retirement,
} from '../src/app/engines.mjs';
import { TOOLS, PRIMARY, CODE_TO_TOOL, inputSpecFor } from '../src/app/toolCatalog/catalog.mjs';
import { MAP } from '../src/app/toolCatalog/migration.mjs';
import { EXAMPLES } from '../src/app/toolCatalog/examples.mjs';

const runTool = (toolId, input) => runEngine(parseEngineCode(PRIMARY[toolId]), input);

test('the catalog has 63 tools, each built on a named method with a primary code', () => {
  assert.equal(Object.keys(TOOLS).length, 63);
  assert.equal(CATALOG_CODES.length, 63);
  assert.equal(new Set(CATALOG_CODES).size, 63, 'two tools share a primary code');
  for (const [id, t] of Object.entries(TOOLS)) {
    assert.ok(t.standard.length > 5, `${id} names no method`);
    assert.ok(t.purpose.length > 20, `${id} has no purpose`);
  }
});

test('every one of the original 248 codes has a verdict, and every running code resolves to a tool', () => {
  assert.equal(REGISTERED_CODES.length, 248);
  for (const code of REGISTERED_CODES) {
    assert.ok(MAP[code], `${code} has no verdict`);
    const tool = toolFor(parseEngineCode(code));
    if (['KEEP', 'REBUILD', 'MERGE'].includes(MAP[code].verdict))
      assert.equal(tool, MAP[code].target, code);
    else {
      assert.equal(tool, null, `${code} is withdrawn but still runs`);
      assert.ok(retirement(code).reason.length > 10);
    }
  }
});

test('every tool runs end to end on its worked example and feeds the agent layer the same shape', () => {
  for (const [id, code] of Object.entries(PRIMARY)) {
    const r = runTool(id, EXAMPLES[id]);
    assert.equal(r.code, code);
    assert.equal(r.toolId, id);
    assert.equal(r.engineName, TOOLS[id].name);
    assert.ok(typeof r.working === 'string' && r.working.length > 40, `${id} has no working text`);
    assert.ok(Array.isArray(r.warnings), `${id} warnings`);
    assert.ok(r.summary && typeof r.summary === 'object', `${id} summary`);
    assert.ok(r.computes.length > 20 && r.limits.length > 20, `${id} disclosure`);
    assert.deepEqual(
      { computes: r.computes, limits: r.limits },
      describeEngine(parseEngineCode(code)),
    );
  }
});

test('a merged code runs the tool it became, recorded under the primary code', () => {
  // R04 "Cadence Stability Score" merged into the Drift & Stability Monitor (primary R03).
  const r = runEngine(parseEngineCode('R04'), EXAMPLES.T07);
  assert.equal(r.toolId, 'T07');
  assert.equal(r.code, PRIMARY.T07);
  assert.equal(r.requestedCode, 'R04');
});

test('schema input is validated before anything runs, naming the row and column', () => {
  assert.throws(
    () => runTool('T29', { risks: [{ risk: 'X', likelihood: 9, impact: 3, controls: 'weak' }] }),
    (e) =>
      e.name === 'EngineInputError' &&
      /Risks, row 1/.test(e.message) &&
      /Likelihood/.test(e.message),
  );
  assert.throws(() => runTool('T29', { risks: [] }), /add at least 1 row/);
  assert.throws(
    () => runTool('T29', { risks: [{ risk: 'X', likelihood: 2, impact: 3, controls: 'magic' }] }),
    /must be one of/,
  );
});

test('Drift & Stability Monitor: XmR limits and the point-beyond-limits rule', () => {
  const values = [10, 11, 10, 9, 10, 11, 10, 9, 10, 25].map((value) => ({ value }));
  const { summary } = runTool('T07', { metric: 'Defects', betterWhen: 'lower', values });
  const xs = values.map((v) => v.value);
  const mean = xs.reduce((a, b) => a + b) / xs.length;
  const mr = xs.slice(1).map((x, i) => Math.abs(x - xs[i]));
  const mrBar = mr.reduce((a, b) => a + b) / mr.length;
  assert.equal(summary.upperControlLimit, Math.round((mean + 2.66 * mrBar) * 100) / 100);
  assert.ok(
    summary.signals.some((s) => s.rule === 'Point outside control limits' && s.at === '#10'),
  );
  assert.equal(summary.verdict, 'drifting');
});

test('Delivery Flow Metrics flags data that breaks Little’s Law', () => {
  const periods = [1, 2, 3].map((i) => ({
    label: `W${i}`,
    throughput: 7,
    cycleTimeDays: 30,
    wip: 7,
  }));
  const r = runTool('T06', { periodDays: 7, periods });
  // WIP 7 at 1 item/day implies ~7 days, not 30.
  assert.equal(r.summary.littlesLawGaps.length, 3);
});

test('OKR progress handles targets that should go down', () => {
  const { summary } = runTool('T04', {
    periodStart: '2026-01-01',
    periodEnd: '2026-12-31',
    asOf: '2026-07-02',
    keyResults: [
      {
        objective: 'Speed',
        keyResult: 'Reply hours',
        start: 24,
        target: 4,
        current: 14,
        owner: 'A',
      },
    ],
  });
  assert.equal(summary.keyResults[0].progressPct, 50);
  assert.equal(summary.keyResults[0].status, 'on track');
});

test('Decision Rights Matrix catches missing and duplicate accountable owners', () => {
  const { summary } = runTool('T20', EXAMPLES.T20);
  const pricing = summary.issues.find((i) => i.decision === 'Change pricing');
  assert.ok(pricing.problems.some((p) => /2 people accountable/.test(p)));
  assert.ok(pricing.problems.includes('no one responsible'));
});

test('Cost of Delay orders by WSJF and flags deadlines that can no longer be met', () => {
  const { summary } = runTool('T23', {
    asOf: '2026-10-01',
    items: [
      { item: 'A', costPerWeek: 1000, weeks: 10 },
      { item: 'B', costPerWeek: 900, weeks: 1 },
      { item: 'C', costPerWeek: 500, weeks: 4, deadline: '2026-10-08' },
    ],
  });
  assert.deepEqual(
    summary.order.map((o) => o.item),
    ['B', 'C', 'A'],
  );
  assert.deepEqual(summary.missedDeadlines, ['C']);
});

test('Forecast Calibration computes Brier scores', () => {
  const { summary } = runTool('T35', {
    predictions: [
      { statement: 'a', forecaster: 'X', probability: 100, outcome: 'happened' },
      { statement: 'b', forecaster: 'X', probability: 0, outcome: 'did not happen' },
      { statement: 'c', forecaster: 'Y', probability: 50, outcome: 'happened' },
    ],
  });
  assert.equal(summary.forecasters.find((f) => f.forecaster === 'X').brier, 0);
  assert.equal(summary.forecasters.find((f) => f.forecaster === 'Y').brier, 0.25);
});

test('Collaboration Network finds the people whose absence splits the network', () => {
  const { summary } = runTool('T14', {
    links: [
      { a: 'A', b: 'B' },
      { a: 'B', b: 'C' },
      { a: 'C', b: 'D' },
    ],
  });
  assert.deepEqual([...summary.brokers].sort(), ['B', 'C']);
});

test('Engagement Survey computes eNPS and hides teams under five responses', () => {
  const { summary } = runTool('T45', EXAMPLES.T45);
  assert.equal(summary.teams[0].eNPS, Math.round(((8 - 4) / 18) * 100));
  assert.equal(summary.teams[1].hidden, true);
  // Overall minus Sales would reveal Legal's three answers.
  assert.equal(summary.overallENPS, null);
});

test('Business Valuation matches a hand-worked DCF and refuses growth at or above the discount rate', () => {
  const { summary } = runTool('T60', {
    discountRatePct: 10,
    terminalGrowthPct: 0,
    netDebt: 0,
    years: [
      { year: '1', fcf: 100 },
      { year: '2', fcf: 100 },
      { year: '3', fcf: 100 },
    ],
  });
  // A flat 100 a year forever at 10% is worth 1,000.
  assert.equal(summary.enterpriseValue, 1000);
  assert.throws(
    () => runTool('T60', { discountRatePct: 5, terminalGrowthPct: 6, years: EXAMPLES.T60.years }),
    /below the discount rate/,
  );
});

test('13-week cash finds the low point and the weeks below the minimum', () => {
  const { summary } = runTool('T57', {
    openingCash: 10000,
    minimumCash: 5000,
    flows: [
      { item: 'Payroll', type: 'payment', amount: 8000, repeat: 'once', startWeek: 3 },
      { item: 'Sales', type: 'receipt', amount: 1000, repeat: 'weekly', startWeek: 1 },
    ],
  });
  assert.equal(summary.lowestWeek, 3);
  assert.equal(summary.lowestCash, 5000);
  assert.equal(summary.endingCash, 15000);
  assert.deepEqual(summary.weeksBelowMinimum, []);
});

test('Change Readiness finds each group’s weakest readiness belief (Armenakis & Harris)', () => {
  const { summary, working } = runTool('T49', EXAMPLES.T49);
  assert.equal(summary.groups[0].weakestBelief, 'efficacy');
  assert.equal(summary.groups[1].weakestBelief, 'discrepancy');
  // (12×18 + 40×12) / 52 people, each group's readiness as % of 25
  assert.equal(summary.overallReadinessPct, Math.round(((12 * 76 + 40 * 48) / 52) * 10) / 10);
  assert.doesNotMatch(working, /ADKAR|Prosci/);
});

test('every tool’s plan level is its subject seat’s base rank, with no name-based escalation', async () => {
  const { MODULE_REGISTRY, CONTEXT_RANK } = await import('../src/app/engineRegistry.mjs');
  const { AREA_HOME_ENGINE, MANIFEST_SYNC } = await import('../src/app/toolCatalog/catalog.mjs');
  const base = {
    Clarity: CONTEXT_RANK.Individual,
    Consistency: CONTEXT_RANK.Professional,
    Growth: CONTEXT_RANK.Founder,
    Finance: CONTEXT_RANK.SME,
    Capability: CONTEXT_RANK.Team,
  };
  for (const [toolId, code] of Object.entries(PRIMARY)) {
    const seat = AREA_HOME_ENGINE[TOOLS[toolId].area];
    assert.equal(MODULE_REGISTRY[code].home_engine, seat, toolId);
    assert.equal(MODULE_REGISTRY[code].minContextRank, base[seat], toolId);
    assert.equal(parseEngineCode(code).homeEngine, seat, toolId);
  }
  // Governance Assessment was enterprise-only purely because its old name was "Enterprise Governance".
  assert.equal(MODULE_REGISTRY[PRIMARY.T32].minContextRank, CONTEXT_RANK.Professional);
  assert.equal(MANIFEST_SYNC.length, 63);
  assert.ok(
    MANIFEST_SYNC.every((m) => m.id === m.id.toLowerCase() && base[m.homeEngine] !== undefined),
  );
});

test('no tool is built on or names a licensed instrument', () => {
  for (const [id, t] of Object.entries(TOOLS)) {
    const text = [
      t.name,
      t.standard,
      t.purpose,
      describeEngine(parseEngineCode(PRIMARY[id])).limits,
    ].join(' ');
    assert.doesNotMatch(text, /ADKAR|Prosci|Gallup|Q12|OCAI|UWES/, id);
  }
});

test('anchored questionnaires leave unanswered questions out and discount unevidenced answers', () => {
  const all5 = { p1: { level: 5, evidence: 2 }, p2: { level: 5, evidence: 0 } };
  const { summary, warnings } = runTool('T01', { answers: all5 });
  assert.equal(summary.sections[0].scorePct, 90); // (5×1 + 5×0.8) / 2 / 5
  assert.equal(summary.sections[1].scorePct, null);
  assert.ok(warnings.some((w) => /unanswered/.test(w)));
  assert.throws(() => runTool('T01', { answers: {} }), /Answer at least one question/);
  assert.throws(() => runTool('T01', { answers: { zz: { level: 3 } } }), /Unknown question/);
});

test('tools built on an original archetype keep its compute and its own form spec', () => {
  // S09 was a four-rating questionnaire; it now runs the weighted-selection calculator.
  const r = runTool('T03', EXAMPLES.T03);
  assert.equal(r.kind, 'selection');
  assert.deepEqual(inputSpecFor('T03'), { kind: 'selection' });
  assert.equal(inputSpecFor('T07').kind, 'schema');
  assert.equal(inputSpecFor('T37').kind, 'anchored');
});

test('every running original code points at a tool that exists', () => {
  for (const toolId of Object.values(CODE_TO_TOOL)) assert.ok(TOOLS[toolId], toolId);
});
