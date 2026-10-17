import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogSummary, demoEngineDetail, resolve, runEngine } from '../src/app/engines.mjs';

const engines = catalogSummary().engines;
const run = (id, input) =>
  runEngine(resolve(engines.find((engine) => engine.toolId === id).code).ref, input).summary;

test('every tool runs end to end on its worked example', () => {
  for (const engine of engines)
    assert.ok(
      runEngine(resolve(engine.code).ref, demoEngineDetail(engine.code).example).summary,
      engine.code,
    );
});
test('anchored questionnaires discount unevidenced answers', () => {
  const detail = demoEngineDetail(engines.find((engine) => engine.toolId === 'T01').code);
  const answers = Object.fromEntries(
    detail.inputs.sections.flatMap((section) =>
      section.questions.map((question) => [question.id, { level: 5, evidence: 2 }]),
    ),
  );
  assert.equal(run('T01', { answers }).overallPct, 100);
  for (const answer of Object.values(answers)) answer.evidence = 0;
  assert.equal(run('T01', { answers }).overallPct, 80);
});
test('OKR progress handles targets that should go down', () => {
  const result = run('T04', {
    periodStart: '2026-01-01',
    periodEnd: '2026-12-31',
    asOf: '2026-07-01',
    keyResults: [
      { objective: 'Support', keyResult: 'Response hours', start: 24, target: 4, current: 14 },
    ],
  });
  assert.equal(result.keyResults[0].progressPct, 50);
});
test('Delivery Flow Metrics flags data that breaks Little’s Law', () => {
  const input = {
    periodDays: 5,
    periods: Array.from({ length: 4 }, (_, i) => ({
      label: `W${i}`,
      throughput: 10,
      cycleTimeDays: 5,
      wip: 10,
      activeDays: 2,
    })),
  };
  assert.equal(run('T06', input).flowEfficiencyPct, 40);
  assert.equal(run('T06', input).littlesLawGaps.length, 0);
  input.periods[0].cycleTimeDays = 100;
  assert.ok(run('T06', input).littlesLawGaps.length);
});
test('Drift & Stability Monitor: XmR limits for a constant series', () => {
  const result = run('T07', {
    metric: 'Output',
    betterWhen: 'higher',
    target: 10,
    values: Array.from({ length: 12 }, (_, i) => ({ label: `P${i}`, value: 10 })),
  });
  assert.equal(result.centreLine, 10);
  assert.equal(result.upperControlLimit, 10);
  assert.equal(result.lowerControlLimit, 10);
  assert.equal(result.sigma, 0);
});
test('Collaboration Network finds the people whose absence disconnects groups', () => {
  const result = run('T14', {
    links: [
      { a: 'Ada', b: 'Ben', strength: 'regular' },
      { a: 'Ben', b: 'Cara', strength: 'regular' },
    ],
  });
  assert.equal(result.people, 3);
  assert.equal(result.groups, 1);
  assert.deepEqual(result.brokers, ['Ben']);
});
test('Decision Rights Matrix catches missing and duplicate accountability', () => {
  const result = run('T20', {
    assignments: [
      { decision: 'Hire', role: 'CEO', code: 'A' },
      { decision: 'Hire', role: 'COO', code: 'A' },
      { decision: 'Ship', role: 'Lead', code: 'R' },
    ],
  });
  assert.equal(result.cleanPct, 0);
  assert.equal(result.issues.length, 2);
});
test('Cost of Delay orders by WSJF and sums waiting costs', () => {
  const result = run('T23', {
    asOf: '2026-10-01',
    items: [
      { item: 'A', costPerWeek: 100, weeks: 2 },
      { item: 'B', costPerWeek: 90, weeks: 1 },
    ],
  });
  assert.equal(result.order[0].item, 'B');
  assert.equal(result.order[0].wsjf, 90);
  assert.equal(result.weeklyCostOfWaiting, 190);
});
test('Forecast Calibration computes Brier scores', () => {
  const result = run('T35', {
    predictions: [
      { statement: 'A', forecaster: 'Ada', probability: 80, outcome: 'happened' },
      { statement: 'B', forecaster: 'Ada', probability: 20, outcome: 'did not happen' },
      { statement: 'C', forecaster: 'Ada', probability: 50, outcome: 'not yet known' },
    ],
  });
  assert.equal(result.overallBrier, 0.04);
  assert.equal(result.resolved, 2);
  assert.equal(result.pending, 1);
});
test('Engagement Survey computes eNPS and suppresses small teams', () => {
  const result = run('T45', {
    teams: [
      { team: 'Large', invited: 10, promoters: 6, passives: 2, detractors: 2 },
      { team: 'Small', invited: 3, promoters: 1, passives: 1, detractors: 1 },
    ],
  });
  assert.equal(result.teams[0].eNPS, 40);
  assert.equal(result.teams[0].responseRatePct, 100);
  assert.equal(result.teams[1].hidden, true);
});
test('Change Readiness finds each group’s weakest belief', () => {
  const result = run('T49', {
    change: 'New workflow',
    groups: [
      {
        group: 'Team',
        size: 10,
        discrepancy: 5,
        appropriateness: 5,
        efficacy: 1,
        support: 5,
        valence: 5,
      },
    ],
  });
  assert.equal(result.groups[0].weakestBelief, 'efficacy');
  assert.equal(result.groups[0].readinessPct, 84);
});
test('13-week cash finds the low point and final balance', () => {
  const result = run('T57', {
    openingCash: 1000,
    minimumCash: 0,
    monthlyRevenue: 100,
    revenueGrowthPct: 0,
    monthlyCosts: 50,
    costGrowthPct: 0,
    flows: [
      { item: 'Receipts', type: 'receipt', amount: 100, repeat: 'weekly', startWeek: 1 },
      { item: 'Payments', type: 'payment', amount: 50, repeat: 'weekly', startWeek: 1 },
    ],
  });
  assert.equal(result.endingCash, 1650);
  assert.equal(result.lowestCash, 1050);
  assert.equal(result.lowestWeek, 1);
  assert.equal(result.rollingForecast.months[11].cash, 1600);
});
test('Business Valuation matches a hand-worked DCF', () => {
  const result = run('T60', {
    discountRatePct: 10,
    terminalGrowthPct: 0,
    netDebt: 100,
    years: [
      { year: '2027', fcf: 100 },
      { year: '2028', fcf: 100 },
      { year: '2029', fcf: 100 },
    ],
  });
  assert.equal(result.enterpriseValue, 1000);
  assert.equal(result.equityValue, 900);
});
test('Financial Health Ratios rejects malformed periods and invalid amounts with status 400', () => {
  const ref = resolve('F01').ref;
  for (const periods of [
    'wrong-type',
    {},
    [null],
    [1],
    [{}],
    [{ revenue: 'bad', cogs: 0, opex: 0 }],
    [],
  ]) {
    assert.throws(
      () => runEngine(ref, { periods }),
      (error) => error.status === 400,
    );
  }
  for (const field of ['cashBalance', 'headcount'])
    for (const value of [-1, 'bad', {}, NaN])
      assert.throws(
        () => runEngine(ref, { periods: [{ revenue: 100, cogs: 40, opex: 20 }], [field]: value }),
        (error) => error.status === 400,
      );
});
