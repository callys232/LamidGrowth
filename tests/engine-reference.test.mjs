import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogSummary, demoEngineDetail, resolve, runEngine } from '../src/app/engines.mjs';

// Reference answers below are explicit arithmetic/classification checks, not generated
// snapshots. The example inputs are part of the contract: changing them requires reworking
// these answers. These cases establish specific behavior, not scientific method validity.
const cases = {
  T02: { 'objectives.0.weightSharePct': 50, orphanSpendPct: 23.1 }, // 3/6; 30k/130k
  T03: { 'winner.totalPct': 60, 'runnerUp.totalPct': 40, marginPct: 20 }, // weights 3:2, opposing extrema
  T05: { 'ranked.0.score': 20, 'ranked.1.score': 16, 'ranked.2.score': 15 }, // impact × likelihood
  T08: { total: 3, overdue: 1, onTimeRatePct: 0 }, // one delivered late, one overdue, one not due
  T09: { overallUtilisationPct: 86, 'teams.0.utilisationPct': 125, 'teams.1.gap': 90 }, // 430/500; 150/120; 300−210
  T10: { throughput: 48, 'nextConstraint.effectiveCapacity': 81, totalIdleCapacity: 99 }, // min(114,48,81); 66+0+33
  T11: {
    'roots.0.depth': 3,
    'roots.1.depth': 1,
    mostProbable: 'Reviewer moved to part-time in March',
  }, // three linked causes vs one unsupported hypothesis
  T12: { 'meetings.1.personHoursPerWeek': 9 }, // 90 min × 6 people / 60
  T13: { 'teams.0.outputPer100Hours': 150, 'teams.0.goodOutputPer100Hours': 145 }, // 900/600×100; (900−30)/600×100
  T15: { totalCost: 42000, 'systems.0.costPerActiveUser': 750, 'systems.1.unusedLicences': 21 }, // 24k+18k; 24k/32; 30−9
  T16: { overallConversionPct: 2.5, timeToMarketDays: 120, innovationReturn: 1.75 }, // 3/120; 10+20+60+30; 350k/200k
  T18: { overallPct: 0, 'requirements.0.scorePct': 33.3, verdict: 'blocked' }, // one of three frame answers; other essential areas absent
  T19: { total: 3, open: 2, medianCycleDays: 19, 'stalled.0.ageDays': 91 }, // June1→20; July1→September30
  T21: { 'winner.totalPct': 60, 'runnerUp.totalPct': 40, marginPct: 20 },
  T22: { 'options.0.expectedValue': 110, 'options.1.expectedValue': 80, evpi: 120 }, // .4×200+.6×50; .4×500−.6×200; perfect info230−110
  T24: { conflictCount: 1, 'conflicts.0.severity': 5, 'conflicts.0.priorityGap': 1 }, // opposing headcount effects 3+2; priorities4−3
  T25: {
    'stakeholders.0.quadrant': 'manage closely',
    'stakeholders.1.quadrant': 'keep informed',
    'stakeholders.2.quadrant': 'keep satisfied',
  }, // high power/interest, low/high, high/low
  T26: { drivingTotal: 4, resistingTotal: 6, net: -2, ratio: 0.67 }, // 4 vs4+2; 4/6
  T27: { domain: 'Complex', doorType: 'one-way' }, // emergent cause/effect; costly reversal
  T28: { 'counts.amber': 1, 'counts.green': 1, 'indicators.1.periodsToRed': 8 }, // 75 between60&90; turnover10<12; (18−10)/(10−9)
  T29: { 'risks.0.inherent': 15, 'risks.1.inherent': 10, 'aboveAppetite.length': 1 }, // 3×5,2×5; weak control still exceeds appetite9
  T30: { overallRealisationPct: 84.6, totalShortfall: 20000, 'items.0.realisationPct': 40 }, // 110k/130k; 130k−110k; 20k/50k
  T33: { 'overdue.length': 1, 'dueSoon.length': 1, 'items.1.daysLeft': 14 }, // Oct1 vs Sep30 and Oct15
  T34: { evidencedPct: 33.3, 'bySource.0.evidencedPct': 50, 'gaps.length': 2 }, // 1/3 and1/2 fully evidenced
  T36: { readyPct: 0, 'activities.0.gaps.length': 1, 'activities.1.gaps.length': 4 }, // tested12h exceeds target8h; second has four recovery gaps
  T40: { coveragePct: 50, 'criticalGaps.0.gap': 2, 'singleExpertSkills.0.people': 1 }, // one of two requirements met; 5−3
  T41: { 'roles.0.projectedSupply': 17, totalShortfall: 11, totalToHire: 9, totalSurplus: 2 }, // 20−3;28−17;11−2;12−2−8
  T42: { coveredPct: 0, 'roles.0.coverDepth': 0, 'roles.0.tooLate.length': 1 }, // successor12months cannot cover3month notice
  T43: { turnoverPct: 20, absenceRatePct: 4, workforceCostSharePct: 33.3 }, // 12/120×12/6;600/(120×125);3m/9m
  T44: {
    'distribution.Star': 1,
    'distribution.Core player': 1,
    'distribution.Under-performer': 1,
    topTalentPct: 33.3,
  }, // one person in each stated cell
  T46: {
    'programmes.0.costPerParticipant': 1500,
    'programmes.0.adjustedBenefit': 42000,
    'programmes.0.roiPct': 40,
  }, // 30k/20;120k×.5×.7;(42k−30k)/30k
  T47: {
    'competencies.0.others': 3.3,
    'competencies.1.others': 4.3,
    'developmentPriorities.length': 1,
  }, // means3.25 and4.25 rounded to1decimal; first below expected4
  T48: { readinessPct: 75, longestGapWeeks: 26, 'gaps.0.gap': 2 }, // (2+4)/(4+4);4−2
  T50: { deliveredPct: 50, averageSlipDays: 27, benefitsForecastPct: 70 }, // 1/2;mean9&45;140k/200k
  T51: { 'ranked.0.score': 533, 'ranked.1.score': 417, 'effortMixPct.H1': 20 }, // 2000×1×.8/3;5000×2×.5/12;3/15
  T52: { 'scored.0.rawValuePct': 60, capacityUsed: 2, 'horizonMix.0.sharePct': 50 }, // attractiveness3/5×fit5/5;two units;one of two H1
  T53: {
    scheduledValue: 9,
    criticalPathLength: 2,
    'periods.0.effortUsed': 3,
    'periods.1.effortUsed': 8,
  }, // values4+5; dependent job follows predecessor
  T54: {
    scheduledValue: 9,
    criticalPathLength: 2,
    'periods.0.effortUsed': 6,
    'periods.1.effortUsed': 8,
  },
  T56: {
    totalRevenue: 210000,
    grossProfit: 127000,
    operatingProfit: 25000,
    revenueGrowthPct: 10,
    revenuePerHead: 10500,
  }, // 210k−83k−102k;110k/100k−1;210k/20
  T58: {
    'current.netMarginPct': 8,
    'current.assetTurnover': 1.25,
    'current.equityMultiplier': 2,
    'current.roePct': 20,
  }, //160k/2m;2m/1.6m;1.6m/800k;160k/800k
  T59: { total: 277000, 'byCategory.3.amount': 17000, 'lines.0.growthPct': 33.3 }, //120+80+60+15+2 thousands;15+2;120/90−1
  T61: {
    effectivePct: 33.3,
    'results.effective': 1,
    'results.deficiency': 1,
    'results.notTested': 1,
  }, // one of three effective
};
const engines = catalogSummary().engines;
const coveredElsewhere = new Set([
  'T01',
  'T04',
  'T06',
  'T07',
  'T14',
  'T20',
  'T23',
  'T35',
  'T45',
  'T49',
  'T57',
  'T60',
]);
for (const engine of engines) {
  const detail = demoEngineDetail(engine.code);
  if (engine.kind === 'anchored') {
    coveredElsewhere.add(engine.toolId);
    test(`${engine.toolId}: anchored endpoints and evidence discount`, () => {
      const answers = Object.fromEntries(
        detail.inputs.sections.flatMap((section) =>
          section.questions.map((question) => [question.id, { level: 5, evidence: 2 }]),
        ),
      );
      const run = () => runEngine(resolve(engine.code).ref, { answers }).summary;
      assert.equal(run().overallPct, 100);
      for (const answer of Object.values(answers)) answer.evidence = 0;
      assert.equal(run().overallPct, 80);
      for (const answer of Object.values(answers)) {
        answer.level = 0;
        answer.evidence = 2;
      }
      assert.equal(run().overallPct, 0);
    });
  } else if (cases[engine.toolId]) {
    test(`${engine.toolId}: hand-worked reference case`, () => {
      const summary = runEngine(resolve(engine.code).ref, structuredClone(detail.example)).summary;
      for (const [path, expected] of Object.entries(cases[engine.toolId])) {
        const actual = path.split('.').reduce((value, key) => value?.[key], summary);
        assert.deepEqual(actual, expected, `${engine.toolId}.${path}`);
      }
    });
  }
}
test('every current engine has an explicit reference case in one of the two suites', () => {
  assert.deepEqual(
    engines
      .filter((engine) => !coveredElsewhere.has(engine.toolId) && !cases[engine.toolId])
      .map((engine) => engine.toolId),
    [],
  );
});
