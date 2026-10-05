/**
 * What has actually been established about each catalog tool, replacing the old unconditional
 * `verified: true`. Five separate states, each backed by named evidence:
 *
 *   implemented          — the tool runs (true for all 63: each runs its worked example in tests)
 *   calculationTested    — known numerical cases are checked against hand-worked answers
 *   methodReviewed       — a person has reviewed this version's reading of the named method
 *   taskEvaluated        — realistic cases met stated acceptance thresholds
 *   operationallyTested  — permissions, charging, persistence and recovery pass integration tests
 *
 * Naming a method in `standard` establishes none of these. A review or evaluation is pinned to
 * the tool version it looked at, so changing the calculation or questionnaire marks it outdated
 * instead of letting it carry over.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { TOOLS } from './catalog.mjs';
import * as strategy from './tools/strategy.mjs';
import * as operations from './tools/operations.mjs';
import * as decisions from './tools/decisions.mjs';
import * as risk from './tools/risk.mjs';
import * as people from './tools/people.mjs';
import * as finance from './tools/finance.mjs';

const MODULES = { strategy, operations, decisions, risk, people, finance };
const ARCHETYPE_FILES = {
  selection: 'selector.mjs',
  optimisation: 'optimisation.mjs',
  'decision-quality': 'decisionQuality.mjs',
  'scenario-decision': 'scenarioDecision.mjs',
  conflict: 'conflict.mjs',
  'bench-strength': 'benchStrength.mjs',
  'growth-pathways': 'growthPathways.mjs',
  roadmap: 'roadmap.mjs',
  financial: 'financial.mjs',
};

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

/** The files whose contents determine what a tool computes. */
function sourceFiles(tool) {
  if (tool.engine === 'anchored') return ['./anchored.mjs', './schema.mjs'];
  if (tool.engine === 'schema') {
    const name = Object.keys(MODULES).find((m) => Object.hasOwn(MODULES[m], tool.impl));
    return [`./tools/${name}.mjs`, './schema.mjs'];
  }
  return [`../engineIntelligence/${ARCHETYPE_FILES[tool.kind]}`, '../engines.mjs'];
}

/** A short content hash of everything that defines the tool. Deliberately coarse: an edit to a
 * shared file changes the version of every tool in it, so a review never outlives a change. */
const VERSIONS = Object.fromEntries(
  Object.entries(TOOLS).map(([id, tool]) => {
    const h = createHash('sha256');
    h.update(JSON.stringify(tool));
    for (const f of sourceFiles(tool)) h.update(read(f));
    return [id, h.digest('hex').slice(0, 12)];
  }),
);
export const toolVersion = (toolId) => VERSIONS[toolId] ?? null;

/* ── Evidence ──────────────────────────────────────────────────────────────────────────────
 * Add an entry only when the evidence exists. Tests re-run on every change, so test evidence is
 * not version-pinned; human reviews and evaluations are, via `version`. */

/** Tests that compare a tool's figures with hand-worked answers. */
const CALCULATION_TESTS = {
  T01: ['tests/tool-catalog.test.mjs — anchored questionnaires … discount unevidenced answers'],
  T04: ['tests/tool-catalog.test.mjs — OKR progress handles targets that should go down'],
  T06: ['tests/tool-catalog.test.mjs — Delivery Flow Metrics flags data that breaks Little’s Law'],
  T07: ['tests/tool-catalog.test.mjs — Drift & Stability Monitor: XmR limits …'],
  T14: ['tests/tool-catalog.test.mjs — Collaboration Network finds the people whose absence …'],
  T20: ['tests/tool-catalog.test.mjs — Decision Rights Matrix catches missing and duplicate …'],
  T23: ['tests/tool-catalog.test.mjs — Cost of Delay orders by WSJF …'],
  T35: ['tests/tool-catalog.test.mjs — Forecast Calibration computes Brier scores'],
  T45: ['tests/tool-catalog.test.mjs — Engagement Survey computes eNPS …'],
  T49: ['tests/tool-catalog.test.mjs — Change Readiness finds each group’s weakest belief'],
  T57: ['tests/tool-catalog.test.mjs — 13-week cash finds the low point …'],
  T60: ['tests/tool-catalog.test.mjs — Business Valuation matches a hand-worked DCF …'],
};

/** { [toolId]: { version, reviewer, date, notes } } — none recorded yet. */
const METHOD_REVIEWS = {};
/** { [toolId]: { version, evaluationPack, threshold, result, date } } — none recorded yet. */
const TASK_EVALUATIONS = {};
/** { [toolId]: [test names] } — database-backed tests that exercise the tool's paid route. */
const OPERATIONAL_TESTS = {};

function pinned(record, version) {
  if (!record) return { status: 'none', evidence: null };
  return record.version === version
    ? { status: 'current', evidence: record }
    : { status: 'outdated', evidence: record };
}

/** The validation record for one tool, as served in the catalog and with every result. */
export function validationFor(toolId) {
  const version = toolVersion(toolId);
  const calc = CALCULATION_TESTS[toolId] ?? [];
  const ops = OPERATIONAL_TESTS[toolId] ?? [];
  return {
    toolVersion: version,
    implemented: {
      status: 'current',
      evidence: ['tests/tool-catalog.test.mjs — every tool runs end to end on its worked example'],
    },
    calculationTested: calc.length
      ? { status: 'current', evidence: calc }
      : { status: 'none', evidence: null },
    methodReviewed: pinned(METHOD_REVIEWS[toolId], version),
    taskEvaluated: pinned(TASK_EVALUATIONS[toolId], version),
    operationallyTested: ops.length
      ? { status: 'current', evidence: ops }
      : { status: 'none', evidence: null },
  };
}

/** Counts per state across the catalog, for the coverage report. */
export function validationCoverage() {
  const states = [
    'implemented',
    'calculationTested',
    'methodReviewed',
    'taskEvaluated',
    'operationallyTested',
  ];
  const all = Object.keys(TOOLS).map(validationFor);
  return Object.fromEntries(
    states.map((s) => [s, all.filter((v) => v[s].status === 'current').length]),
  );
}
