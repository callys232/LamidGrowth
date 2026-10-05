// Regression cases from the 5 October 2026 engine audit (audit-results/engine-deep-scan-2026-10-05).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runEngine, parseEngineCode } from '../src/app/engines.mjs';
import { TOOLS, PRIMARY, inputSpecFor } from '../src/app/toolCatalog/catalog.mjs';
import { EXAMPLES } from '../src/app/toolCatalog/examples.mjs';

const runTool = (toolId, input) => runEngine(parseEngineCode(PRIMARY[toolId]), input);
const inputError = (e) => e.name === 'EngineInputError' && e.status === 400;

function nonfinite(v, path = '') {
  if (typeof v === 'number') return Number.isFinite(v) ? [] : [path];
  if (!v || typeof v !== 'object') return [];
  return Object.entries(v).flatMap(([k, x]) => nonfinite(x, `${path}.${k}`));
}

/* H2 — Engagement Survey anonymity */
test('survey: one small group does not leak its score through the overall figures', () => {
  const r = runTool('T45', {
    teams: [{ team: 'Small', invited: 1, promoters: 1, passives: 0, detractors: 0 }],
  });
  assert.equal(r.summary.overallENPS, null);
  assert.equal(r.summary.overallResponseRatePct, null);
  assert.doesNotMatch(r.working, /eNPS 100|1 response/);
});

test('survey: a single hidden team cannot be recovered by subtracting shown teams from the total', () => {
  const r = runTool('T45', {
    teams: [
      { team: 'Small', invited: 3, promoters: 3, passives: 0, detractors: 0 },
      { team: 'Big', invited: 10, promoters: 2, passives: 4, detractors: 4 },
    ],
  });
  const big = r.summary.teams.find((t) => t.team === 'Big');
  // Either the overall is withheld, or the other team is suppressed too.
  assert.ok(r.summary.overallENPS === null || big.hidden, JSON.stringify(r.summary));
});

test('survey: hidden teams that together reach the threshold leave the overall visible', () => {
  const r = runTool('T45', {
    teams: [
      { team: 'A', invited: 3, promoters: 3, passives: 0, detractors: 0 },
      { team: 'B', invited: 3, promoters: 0, passives: 0, detractors: 3 },
      { team: 'C', invited: 10, promoters: 5, passives: 3, detractors: 2 },
    ],
  });
  assert.equal(r.summary.overallENPS, Math.round(((8 - 5) / 16) * 100));
  assert.equal(r.summary.teams.find((t) => t.team === 'C').eNPS, 30);
});

/* H3 — Drift monitor identity */
test('drift: repeated period labels give the same verdict as unique labels', () => {
  const xs = [10, 11, 10, 9, 10, 11, 10, 9, 10, 25];
  const same = runTool('T07', {
    metric: 'Defects',
    betterWhen: 'lower',
    values: xs.map((value) => ({ label: 'Week', value })),
  });
  const unique = runTool('T07', {
    metric: 'Defects',
    betterWhen: 'lower',
    values: xs.map((value, i) => ({ label: `W${i}`, value })),
  });
  assert.equal(unique.summary.verdict, 'drifting');
  assert.equal(same.summary.verdict, 'drifting');
  assert.equal(same.summary.signals.length, unique.summary.signals.length);
  assert.ok(same.warnings.some((w) => /drifting/.test(w)));
});

/* H4 — anchored questionnaires */
test('anchored: fractional evidence is refused, not turned into NaN', () => {
  assert.throws(() => runTool('T01', { answers: { p1: { level: 5, evidence: 0.5 } } }), inputError);
  assert.throws(() => runTool('T01', { answers: { p1: { level: 5, evidence: 3 } } }), inputError);
  assert.throws(
    () => runTool('T01', { answers: { p1: { level: 5, evidence: 'lots' } } }),
    inputError,
  );
});

test('anchored: one answer of six cannot produce an overall maturity conclusion', () => {
  const r = runTool('T01', { answers: { p1: { level: 5, evidence: 2 } } });
  assert.equal(r.summary.provisional, true);
  assert.equal(r.summary.overallPct, null);
  assert.equal(r.summary.maturityLevel, null);
  assert.equal(r.summary.sections[0].scorePct, 100);
  assert.doesNotMatch(r.working, /Continuously improved/);
  assert.ok(r.warnings.some((w) => /provisional/i.test(w)));
});

test('anchored: maturity level follows the evidence-adjusted score, not raw levels', () => {
  const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
  const answers = Object.fromEntries(ids.map((id) => [id, { level: 5, evidence: 0 }]));
  const r = runTool('T01', { answers });
  assert.equal(r.summary.provisional, false);
  assert.equal(r.summary.overallPct, 80);
  assert.equal(r.summary.maturityLevel, 4); // 5 × 0.8 opinion-only discount
  assert.equal(r.summary.evidenceBasis, 'self-reported');
});

/* M1 — user text used as dictionary keys */
test('schema tools accept text that matches Object.prototype names', () => {
  const failures = [];
  for (const [id, t] of Object.entries(TOOLS)) {
    if (t.engine !== 'schema') continue;
    const spec = inputSpecFor(id);
    for (const table of spec.tables) {
      for (const col of table.columns.filter((c) => c.type === 'text')) {
        for (const word of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
          const input = structuredClone(EXAMPLES[id]);
          if (!input[table.key]?.length) continue;
          for (const row of input[table.key]) row[col.key] = word;
          try {
            const r = runTool(id, input);
            const bad = nonfinite(r);
            if (bad.length) failures.push(`${id} ${col.key}=${word}: non-finite ${bad[0]}`);
          } catch (e) {
            if (e.status !== 400) failures.push(`${id} ${col.key}=${word}: ${e.message}`);
          }
        }
      }
    }
  }
  assert.deepEqual(failures, []);
});

/* M3 — root cause */
test('root cause: an unsupported, contradicted cause is not named most probable', () => {
  const r = runTool('T11', {
    problem: 'Lost sales',
    causes: [{ cause: 'Bad product', category: 'Process', evidence: 'none', fitsFacts: 'no' }],
  });
  assert.equal(r.summary.mostProbable, null);
  assert.equal(r.summary.outcome, 'insufficient evidence');
  assert.doesNotMatch(r.working, /Most probable root cause: Bad product/);
});

test('root cause: a supported cause is reported as a leading hypothesis', () => {
  const r = runTool('T11', {
    problem: 'Lost sales',
    causes: [{ cause: 'Price rise', category: 'Process', evidence: 'some', fitsFacts: 'yes' }],
  });
  assert.equal(r.summary.mostProbable, 'Price rise');
  assert.equal(r.summary.outcome, 'leading hypothesis');
});

/* M4 — cross-field validation */
test('flow metrics refuse active time longer than the cycle time', () => {
  const periods = [1, 2, 3].map((i) => ({
    label: `W${i}`,
    throughput: 7,
    cycleTimeDays: 1,
    wip: 1,
    activeDays: 10,
  }));
  assert.throws(() => runTool('T06', { periodDays: 7, periods }), inputError);
});

test('workforce plan refuses more leavers than current headcount', () => {
  assert.throws(
    () => runTool('T41', { roles: [{ role: 'Analyst', current: 2, leavers: 10, needed: 3 }] }),
    inputError,
  );
});

test('dates must exist on the calendar', () => {
  assert.throws(
    () => runTool('T19', { decisions: [{ title: 'X', raised: '2026-02-31', status: 'open' }] }),
    /must be a date/,
  );
});

test('decision register refuses a decision dated before it was raised', () => {
  assert.throws(
    () =>
      runTool('T19', {
        decisions: [{ title: 'X', raised: '2026-03-01', decided: '2026-02-01', status: 'decided' }],
      }),
    inputError,
  );
});

test('required text and numbers made of spaces count as missing', () => {
  assert.throws(
    () =>
      runTool('T02', { objectives: [{ name: '   ' }], initiatives: [{ name: 'A', budget: 1 }] }),
    /required/,
  );
  assert.throws(
    () => runTool('T41', { roles: [{ role: 'Analyst', current: '   ', needed: 3 }] }),
    /required/,
  );
});

test('a result that overflows to a non-finite number is refused, not saved as null', () => {
  const opp = { ...EXAMPLES.T51.opportunities[0], reach: 1e308, confidence: 100, effort: 0.1 };
  assert.throws(() => runTool('T51', { opportunities: [opp] }), inputError);
});

/* M5 — cadence coverage */
test('rhythm: an annual plan does not count as a quarterly strategy review', () => {
  const r = runTool('T12', {
    people: 5,
    meetings: [
      { name: 'Annual plan', frequency: 'yearly', minutes: 60, attendees: 5, purpose: 'plan' },
    ],
  });
  assert.ok(r.summary.missingRhythmLevels.includes('quarterly strategy review'));
});

test('rhythm: a fortnightly progress review does not count as weekly', () => {
  const r = runTool('T12', {
    people: 5,
    meetings: [
      {
        name: 'Progress',
        frequency: 'fortnightly',
        minutes: 60,
        attendees: 5,
        purpose: 'review progress',
      },
    ],
  });
  assert.ok(r.summary.missingRhythmLevels.includes('weekly operational review'));
});

/* M2 — empty input must not become a completed (billable) run */
test('tools on the original archetypes refuse input too thin to compute anything', () => {
  for (const id of ['T03', 'T10', 'T18', 'T21', 'T22', 'T24', 'T42', 'T52', 'T53', 'T54']) {
    assert.throws(() => runTool(id, {}), inputError, `${id} accepted {}`);
    runTool(id, structuredClone(EXAMPLES[id])); // its worked example still runs
  }
  // One option is not a comparison.
  const one = structuredClone(EXAMPLES.T21);
  one.options = one.options.slice(0, 1);
  assert.throws(() => runTool('T21', one), inputError);
});

/* H4 — malformed questionnaire answers */
test('anchored: an answer that is not a {level, evidence} object is refused', () => {
  for (const bad of [5, 'x', [3], { level: 3, evidence: 1, extra: true }])
    assert.throws(() => runTool('T01', { answers: { p1: bad } }), inputError, JSON.stringify(bad));
  assert.throws(() => runTool('T01', { answers: [] }), inputError);
  assert.throws(() => runTool('T01', { answers: 'all good' }), inputError);
});

/* M4 — non-finite results on the original archetypes */
test('a non-finite result from an original-archetype tool is refused', () => {
  const steps = structuredClone(EXAMPLES.T10);
  steps.steps = steps.steps.map((st) => ({ ...st, capacity: 1e308 }));
  const scen = structuredClone(EXAMPLES.T22);
  scen.options = scen.options.map((o) =>
    JSON.parse(JSON.stringify(o).replace(/:(-?\d+(\.\d+)?)/g, ':1e308')),
  );
  for (const [id, input] of [
    ['T10', steps],
    ['T22', scen],
  ])
    assert.throws(() => runTool(id, input), inputError, id);
});

test('roadmap refuses a period count that would exhaust memory', () => {
  for (const periods of [1e7, 0, 2.5, -3])
    assert.throws(
      () => runTool('T53', { ...structuredClone(EXAMPLES.T53), periods }),
      inputError,
      String(periods),
    );
});

/* Result contract — every run states how far its conclusion can be relied on */
test('every tool result carries an analytical status', () => {
  for (const id of Object.keys(PRIMARY)) {
    const r = runTool(id, structuredClone(EXAMPLES[id]));
    assert.ok(['completed', 'provisional', 'insufficient_evidence'].includes(r.status), id);
    assert.ok(Array.isArray(r.missingEvidence), id);
  }
});

test('a partly answered questionnaire is provisional and names what is missing', () => {
  const r = runTool('T01', { answers: { p1: { level: 3, evidence: 1 } } });
  assert.equal(r.status, 'provisional');
  assert.equal(r.missingEvidence.length, 5);
  const full = runTool('T01', structuredClone(EXAMPLES.T01));
  assert.equal(full.status, 'completed');
});

test('root cause with no supported candidate is insufficient evidence', () => {
  const r = runTool('T11', {
    problem: 'Lost sales',
    causes: [{ cause: 'Bad product', category: 'Process', evidence: 'none', fitsFacts: 'no' }],
  });
  assert.equal(r.status, 'insufficient_evidence');
  assert.ok(r.missingEvidence.length >= 1);
});

/* H5 — "verified" replaced by evidence-backed validation states */
test('validation states are evidence-backed, not an unconditional verified flag', async () => {
  const { validationFor, validationCoverage, toolVersion } =
    await import('../src/app/toolCatalog/validation.mjs');
  const v = validationFor('T60');
  assert.match(v.toolVersion, /^[0-9a-f]{12}$/);
  assert.equal(v.implemented.status, 'current');
  assert.equal(v.calculationTested.status, 'current');
  assert.ok(v.calculationTested.evidence.length);
  assert.equal(v.methodReviewed.status, 'none');
  assert.equal(v.taskEvaluated.status, 'none');
  assert.equal(validationFor('T15').calculationTested.status, 'none');
  const c = validationCoverage();
  assert.equal(c.implemented, 63);
  assert.ok(c.calculationTested > 0 && c.calculationTested < 63);
  assert.notEqual(toolVersion('T01'), toolVersion('T02'));
});

/* A1 — canonical capability traceability */
test('the canonical crosswalk covers all 202 capabilities and never claims acceptance', async () => {
  const { traceability, traceabilitySummary, TOOL_TO_CANONICAL } =
    await import('../src/app/toolCatalog/canonical.mjs');
  const { agentCallersByTool } = await import('../src/app/capabilities.mjs');
  const rows = traceability(agentCallersByTool());
  assert.equal(rows.length, 202);
  assert.equal(new Set(rows.map((r) => r.id)).size, 202);
  const ids = new Set(rows.map((r) => r.id));
  for (const [tool, caps] of Object.entries(TOOL_TO_CANONICAL)) {
    assert.ok(TOOLS[tool], `${tool} is not a catalog tool`);
    for (const c of caps) assert.ok(ids.has(c), `${tool} links unknown ${c}`);
  }
  assert.ok(rows.every((r) => r.acceptance === 'not established'));
  assert.ok(rows.flatMap((r) => r.tools).every((t) => t.relation === 'partial'));
  const rca = rows.find((r) => r.id === 'T-007');
  assert.equal(rca.tools[0].toolId, 'T11');
  assert.ok(rca.tools[0].callers.includes('agent:diagnostic-intelligence'));
  const s = traceabilitySummary(rows);
  assert.equal(s.withPartialTool + s.withoutTool, 202);
  assert.equal(s.accepted, 0);
});
