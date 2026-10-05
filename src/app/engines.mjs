import { z } from 'zod';
import { accessibleEngineCodes } from './entitlements.mjs';
import {
  getModuleConfig,
  MODULE_REGISTRY,
  buildFallbackConfig,
  ENGINE_CODES,
} from './engineRegistry.mjs';
import { computeAssessment, assessmentToPrompt } from './engineIntelligence/assessment.mjs';
import {
  computeDecisionQuality,
  decisionQualityToPrompt,
  DQ_QUESTIONS,
  REQUIREMENTS,
} from './engineIntelligence/decisionQuality.mjs';
import {
  computeGrowthPathways,
  growthPathwaysToPrompt,
} from './engineIntelligence/growthPathways.mjs';
import {
  computeBenchStrength,
  benchStrengthToPrompt,
} from './engineIntelligence/benchStrength.mjs';
import {
  computeScenarioDecision,
  scenarioDecisionToPrompt,
} from './engineIntelligence/scenarioDecision.mjs';
import { computeRoadmap, roadmapToPrompt } from './engineIntelligence/roadmap.mjs';
import { computeOptimisation, optimisationToPrompt } from './engineIntelligence/optimisation.mjs';
import { computeSelection, selectionToPrompt } from './engineIntelligence/selector.mjs';
import { computeConflicts, conflictsToPrompt } from './engineIntelligence/conflict.mjs';
import { computeFinancials, financialsToPrompt } from './engineIntelligence/financial.mjs';
import { computeRoster, rosterToPrompt } from './engineIntelligence/roster.mjs';
import { computeScenarios, scenariosToPrompt } from './engineIntelligence/scenario.mjs';
import { computeSeriesStats, seriesStatsToPrompt } from './engineIntelligence/inputSpec.mjs';
import {
  TOOLS,
  PRIMARY,
  PRIMARY_CODES,
  CODE_TO_TOOL,
  retirement,
  inputSpecFor,
  disclosureFor,
  runCatalogTool,
  homeEngineFor,
} from './toolCatalog/catalog.mjs';
import { EXAMPLES } from './toolCatalog/examples.mjs';
import { assertFinite } from './toolCatalog/schema.mjs';
import { validationFor, validationCoverage } from './toolCatalog/validation.mjs';
import { TOOL_TO_CANONICAL } from './toolCatalog/canonical.mjs';

/**
 * THE ENGINE LAYER — ported from LamidOne's src/lib/engines.ts (+ the 12
 * compute files under src/lib/intelligence/) with the compute logic and
 * manifest data kept verbatim in spirit. See src/app/engineRegistry.mjs and
 * src/app/engineIntelligence/* for the ported compute layer.
 *
 * LamidOne gated these by subscription tier; LamidGrowth has no tier concept
 * (workspace.tier only gates team seats — confirmed by direct reading of
 * policy.mjs and app.mjs). So this port drops the tier gate entirely and
 * charges a flat points cost per run instead, matching how every other
 * billable action in this app works (see agent_manifests.points_cost).
 *
 * These are diagnostic TOOLS, not chat AGENTS — every one of the 14 input
 * archetypes below takes structured input and returns a deterministically
 * computed result. No model call is involved anywhere in this file: that is
 * the entire point of this engine layer (LamidOne built it specifically to
 * stop a model from inventing scores).
 */

/** Fallback home engine by series letter, matching engineRegistry.mjs (the C "CORE Console"
 * series was wrongly listed as Finance here while the registry and database had it as Shared).
 * A code that runs as a catalog tool takes the tool's own seat instead — see homeOf(). */
const SERIES_TO_HOME_ENGINE = {
  S: 'Clarity',
  Q: 'Clarity',
  R: 'Consistency',
  P: 'Consistency',
  X: 'Consistency',
  Z: 'Growth',
  G: 'Growth',
  A: 'Capability',
  F: 'Finance',
  C: 'Shared',
};

/** Flat points cost per engine run — cheaper than the AI-backed chat agents (65pts)
 *  since no model call is involved. A placeholder judgment call, not derived from
 *  either source project (LamidOne priced these via subscription tier, not points). */
export const ENGINE_POINTS_COST = 35;

/** A code's seat: its catalog tool's seat when it runs as one, else its series default. */
function homeOf(code, series) {
  const toolId = CODE_TO_TOOL[code];
  return toolId ? homeEngineFor(toolId) : (SERIES_TO_HOME_ENGINE[series] ?? 'Shared');
}

/** `q44` / `Q44` → normalised reference, or null when not a module code.
 *  2-3 digits: the registry runs past 99 for one series (Q01-Q100), which the LamidOne
 *  source's own `\d{2}`-only regex could not actually reach — widened here rather than
 *  porting that gap forward. */
export function parseEngineCode(input) {
  const m = /^([A-Za-z])(\d{2,3})$/.exec(String(input).trim());
  if (!m) return null;
  const series = m[1].toUpperCase();
  return {
    code: `${series}${m[2]}`,
    series,
    homeEngine: homeOf(`${series}${m[2]}`, series),
  };
}

export function configFor(ref) {
  return (
    getModuleConfig?.(ref.code) ??
    MODULE_REGISTRY[ref.code] ??
    buildFallbackConfig(ref.code, `${ref.series}-Series`, `${ref.code} Engine`)
  );
}

export const REGISTERED_CODES = ENGINE_CODES;

/* ── Standards-based tool catalog (src/app/toolCatalog) ──────────────────────
   The 248 ported modules were reviewed against recognised methods and consolidated into 63
   tools. Every original code that still runs (kept, rebuilt or merged) resolves to its tool;
   the tool is served under one primary code so manifests, bundles and history are unchanged. */

/** The catalog tool an engine code now runs as, or null when the code was withdrawn. */
export function toolFor(ref) {
  return ref ? (CODE_TO_TOOL[ref.code] ?? null) : null;
}

/** The 63 codes the catalog lists — one per tool. */
export const CATALOG_CODES = PRIMARY_CODES;

/** Why a withdrawn code no longer runs, and what replaced it (null for a code that still runs). */
export { retirement };

export class EngineInputError extends Error {
  constructor(msg) {
    super(msg);
    this.name = 'EngineInputError';
    this.status = 400;
  }
}

const arr = (v) => (Array.isArray(v) ? v : []);

const clamp = (n, lo, hi, fallback) => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;
};

/**
 * Builds the assessment rows for a module from ITS OWN dimensions.
 *
 * Accepts the caller's ratings in either form:
 *   · `ratings: { "Field Coherence": { rating, weight, evidence } }`
 *   · `rows: [...]` positionally, matched to the declared labels in order
 *
 * A row whose label is not one of the module's dimensions is refused rather
 * than scored, because a score is only meaningful against the question the
 * engine claims to ask. Missing dimensions are included unrated so the
 * output always has the full declared shape and the gaps are visible
 * instead of silently absent.
 */
function alignToDimensions(config, input) {
  const labels = config.dimensionLabels?.length
    ? config.dimensionLabels
    : ['Primary', 'Secondary', 'Tertiary', 'Quaternary'];

  const supplied = arr(input.rows);
  const byLabel = new Map();
  const declared = new Set(labels.map((l) => l.trim().toLowerCase()));

  const unknownLabels = [];
  let anyLabelled = false;

  for (const r of supplied) {
    if (typeof r?.label !== 'string' || !r.label.trim()) continue;
    anyLabelled = true;
    const key = r.label.trim().toLowerCase();
    if (declared.has(key)) byLabel.set(key, r);
    else unknownLabels.push(r.label.trim());
  }

  if (unknownLabels.length > 0) {
    throw new EngineInputError(
      `This engine does not assess: ${unknownLabels.join(', ')}. ` +
        `Its dimensions are: ${labels.join(', ')}.`,
    );
  }

  const ratings = input.ratings ?? {};

  const rows = labels.map((label, i) => {
    const match =
      byLabel.get(label.trim().toLowerCase()) ??
      ratings[label] ??
      (anyLabelled ? undefined : supplied[i]) ??
      {};

    // A dimension the caller did not rate stays unrated (null) — scoring it as 0 would claim
    // "not true at all" for something nobody assessed, and drag the index down with it.
    const rated = match.rating !== undefined && match.rating !== null && match.rating !== '';
    return {
      id: String(i + 1),
      label,
      rating: rated ? clamp(match.rating, 0, 5, null) : null,
      weight: clamp(match.weight, 1, 3, 2),
      evidence: clamp(match.evidence, 0, 2, 0),
      ...(match.note ? { note: String(match.note).slice(0, 400) } : {}),
    };
  });

  if (rows.every((r) => r.rating === null)) {
    throw new EngineInputError(
      `This engine assesses: ${labels.join(', ')}. Supply a rating (0-5) for at least one, as ` +
        `rows: [{ label, rating, weight, evidence }] or ratings: { "<dimension>": { rating } }.`,
    );
  }

  return rows;
}

/**
 * Run a module against its declared input shape.
 *
 * The registry declares `inputs.kind` per module; this switch is the only
 * place that mapping lives. An unrecognised module still lands on the
 * assessment compute rather than on a model, exactly as `buildFallbackConfig`
 * intends.
 */
/**
 * What each compute archetype actually does, in plain words, and what it does not. Engine names
 * and purposes (ported from LamidOne) often promise more than their archetype computes — e.g. a
 * "Budgeting & Forecasting" engine that only does historical P&L arithmetic, or thirty "Cadence"
 * engines that share one trend-statistics function. This is shown next to the name in the
 * catalog, the detail view and every result, so nobody pays for an engine believing it does more.
 */
const DISCLOSURES = {
  assessment: (config) => ({
    computes: `Scores your own 0–5 ratings of this engine's dimensions (${(config.dimensionLabels ?? []).join(', ')}), weighted by how much each matters and discounted where you have no evidence.`,
    limits: `It works only from your ratings: it does not produce the "${config.engineName}" itself, research your organisation, or check your ratings against outside data.`,
  }),
  timeseries: () => ({
    computes:
      'Trend statistics for the numbers you enter per period: change, volatility, trend direction and gap to target.',
    limits:
      'It is not connected to live data and does not diagnose causes: it reads only the values you type in, so it is as current as your last entry.',
  }),
  financial: () => ({
    computes:
      'Profit-and-loss arithmetic on the periods you enter: gross and operating margin, revenue growth, net burn, runway and revenue per head.',
    limits:
      'It does not forecast future periods and does not value the business: every figure describes the historical periods you entered.',
  }),
  roster: () => ({
    computes:
      'Workforce figures from the roles you enter: headcount, capability, attrition risk and successor coverage per role.',
    limits:
      'It does not assess individual people or read HR systems; it works only from the role figures you enter.',
  }),
  scenario: () => ({
    computes:
      'Expected value and downside risk for each option from the probability, upside and downside you enter.',
    limits:
      'The probabilities and values are your own estimates; it does not predict outcomes or supply market data.',
  }),
  'scenario-decision': () => ({
    computes:
      'Compares your options across the futures you define under three decision rules, and reports what perfect information about the future would be worth.',
    limits:
      'The futures, their likelihoods and payoffs are yours; it does not forecast which future will happen.',
  }),
  roadmap: () => ({
    computes:
      'Sequences the initiatives you enter into periods, respecting dependencies and per-period capacity, and reports the critical path.',
    limits:
      'Effort, value and dependencies are your estimates; it does not estimate the work or assign people.',
  }),
  optimisation: () => ({
    computes:
      'Finds the bottleneck step from the capacities you enter for each step, and where improvement would actually raise throughput.',
    limits:
      'It works on the step figures you enter; it does not measure your process or its costs.',
  }),
  selection: () => ({
    computes:
      'Weighted scoring of your options against your criteria, normalised for scale, with a check on how sensitive the winner is to the weights.',
    limits: 'Criteria, weights and scores are yours; it does not research or verify the options.',
  }),
  conflict: () => ({
    computes:
      'Checks the objectives you enter pair by pair and flags tensions that have no stated trade-off.',
    limits:
      'It only finds conflicts among the objectives you enter; it does not know your other goals.',
  }),
  'decision-quality': () => ({
    computes:
      'Scores one decision against a fixed set of requirements (options, criteria, owner, information and more), limited by its weakest requirement.',
    limits: 'It rates how the decision is being made, not whether the eventual choice is right.',
  }),
  'growth-pathways': () => ({
    computes:
      'Compares the growth pathways you enter and returns a sequenced portfolio that fits your capacity.',
    limits:
      'Pathway values and costs are your estimates; it does not find new pathways or supply market data.',
  }),
  'bench-strength': () => ({
    computes:
      'Measures succession coverage for each critical seat from the successors and readiness you enter.',
    limits: 'It works from the figures you enter; it does not assess the people themselves.',
  }),
  narrative: () => ({
    computes: "Organises the text you enter into this engine's sections.",
    limits: 'It performs no scoring or analysis of what you write.',
  }),
};

export function describeEngine(ref) {
  const toolId = toolFor(ref);
  if (toolId) {
    const own = disclosureFor(toolId);
    if (own) return own;
    // A tool built on an original archetype keeps that archetype's disclosure.
    const config = configFor(parseEngineCode(PRIMARY[toolId]));
    return (DISCLOSURES[TOOLS[toolId].kind] ?? DISCLOSURES.assessment)(config);
  }
  const config = configFor(ref);
  const disclose = DISCLOSURES[config.inputs?.kind ?? 'assessment'] ?? DISCLOSURES.assessment;
  return disclose(config);
}

/** Runs the tool a code resolves to. The result has the same shape for every tool — summary,
 * working (the text the agent layer reads), warnings, computes and limits — so the intelligence
 * layer consumes catalog tools exactly as it consumed the original engines. */
export function runEngine(ref, input) {
  const toolId = toolFor(ref);
  if (!toolId) return { ...computeEngineRun(ref, input), ...describeEngine(ref) };
  const tool = TOOLS[toolId];
  const primary = parseEngineCode(PRIMARY[toolId]);
  const identity = {
    code: primary.code,
    homeEngine: primary.homeEngine,
    engineName: tool.name,
    seriesName: tool.area,
    toolId,
    standard: tool.standard,
    ...(ref.code !== primary.code ? { requestedCode: ref.code } : {}),
  };
  if (tool.engine === 'existing') {
    const run = computeEngineRun(primary, input, tool.kind);
    assertFinite(run.summary);
    return {
      ...run,
      status: 'completed',
      missingEvidence: [],
      ...identity,
      ...describeEngine(primary),
    };
  }
  const out = runCatalogTool(toolId, input);
  return {
    ...identity,
    kind: tool.engine,
    status: 'completed',
    missingEvidence: [],
    ...out,
    ...describeEngine(primary),
  };
}

/** The roadmap allocates per period, so an unbounded count exhausts memory. */
const MAX_PERIODS = 60;

/** The least input each original archetype needs before its result means anything. Without it,
 * `{}` came back as a normal (and charged) run full of "add some options" warnings. */
const MINIMUM_INPUT = {
  selection: (i) =>
    (arr(i.options).length < 2 && 'Add at least 2 options to compare.') ||
    (arr(i.criteria).length < 1 && 'Add at least 1 criterion.'),
  optimisation: (i) => arr(i.steps).length < 2 && 'Add at least 2 process steps.',
  'decision-quality': (i) =>
    (!i.answers || typeof i.answers !== 'object' || !Object.keys(i.answers).length) &&
    'Answer at least one decision-quality question.',
  'scenario-decision': (i) =>
    (arr(i.scenarios).length < 1 && 'Add at least 1 future scenario.') ||
    (arr(i.options).length < 2 && 'Add at least 2 options to compare.'),
  conflict: (i) => arr(i.objectives).length < 2 && 'Add at least 2 objectives to check.',
  'bench-strength': (i) => arr(i.roles).length < 1 && 'Add at least 1 critical role.',
  'growth-pathways': (i) => arr(i.pathways).length < 1 && 'Add at least 1 growth pathway.',
  roadmap: (i) =>
    (arr(i.initiatives).length < 1 && 'Add at least 1 initiative.') ||
    (i.periods !== undefined &&
      !(Number.isInteger(Number(i.periods)) && i.periods >= 1 && i.periods <= MAX_PERIODS) &&
      `Periods must be a whole number from 1 to ${MAX_PERIODS}.`),
};
function computeEngineRun(ref, input, kindOverride) {
  const config = configFor(ref);
  const kind = kindOverride ?? config.inputs?.kind ?? 'assessment';
  const missing = MINIMUM_INPUT[kind]?.(input);
  if (missing) throw new EngineInputError(missing);
  const warnings = [];

  let summary;
  let working;

  /* Q44 runs its own engine rather than the shared four-dimension archetype.
     Decision quality is a CHAIN limited by its weakest requirement, not a
     weighted mean — averaging lets a strong frame hide a missing owner,
     which is the exact failure the module exists to catch. */
  if (kind === 'decision-quality') {
    const dq = computeDecisionQuality(input.answers ?? {}, input.consequence, input.reversibility);
    return {
      code: ref.code,
      homeEngine: ref.homeEngine,
      engineName: config.engineName,
      seriesName: config.seriesName,
      kind: 'decision-quality',
      summary: dq,
      working: decisionQualityToPrompt(dq),
      warnings: [
        ...dq.confidenceFlags,
        ...(dq.fatalIssues.length ? [`Fatal gaps: ${dq.fatalIssues.join('; ')}`] : []),
      ],
    };
  }

  /* G03 compares candidate pathways against each other and returns a
     sequenced portfolio under a capacity constraint — a recommendation, not
     a score. */
  if (kind === 'growth-pathways') {
    const gp = computeGrowthPathways(input.pathways ?? [], Number(input.capacity) || 3);
    return {
      code: ref.code,
      homeEngine: ref.homeEngine,
      engineName: config.engineName,
      seriesName: config.seriesName,
      kind: 'growth-pathways',
      summary: gp,
      working: growthPathwaysToPrompt(gp),
      warnings: [...gp.warnings, ...gp.portfolioWarnings],
    };
  }

  /* A22 measures succession COVERAGE per seat. A weighted mean would let
     eight well-covered roles average away the two that will actually break
     the organisation. */
  if (kind === 'bench-strength') {
    const bs = computeBenchStrength(input.roles ?? []);
    return {
      code: ref.code,
      homeEngine: ref.homeEngine,
      engineName: config.engineName,
      seriesName: config.seriesName,
      kind: 'bench-strength',
      summary: bs,
      working: benchStrengthToPrompt(bs),
      warnings: [...bs.warnings, ...bs.planWarnings],
    };
  }

  /* One archetype, several planner modules: options evaluated across
     futures under three decision rules, with EVPI. */
  if (kind === 'scenario-decision') {
    const sd = computeScenarioDecision(input.scenarios ?? [], input.options ?? []);
    return {
      code: ref.code,
      homeEngine: ref.homeEngine,
      engineName: config.engineName,
      seriesName: config.seriesName,
      kind: 'scenario-decision',
      summary: sd,
      working: scenarioDecisionToPrompt(sd),
      warnings: sd.warnings,
    };
  }

  /* Initiatives sequenced into a phased plan under dependencies and
     per-period capacity, with the critical path reported. */
  if (kind === 'roadmap') {
    const rm = computeRoadmap(
      input.initiatives ?? [],
      Number(input.periods) || 4,
      Number(input.capacityPerPeriod) || 10,
      String(input.periodLabel ?? 'Quarter'),
    );
    return {
      code: ref.code,
      homeEngine: ref.homeEngine,
      engineName: config.engineName,
      seriesName: config.seriesName,
      kind: 'roadmap',
      summary: rm,
      working: roadmapToPrompt(rm),
      warnings: [...rm.warnings, ...rm.guidance],
    };
  }

  /* Throughput is set by the constraint, so improving anything else is
     waste (theory of constraints). */
  if (kind === 'optimisation') {
    const op = computeOptimisation(input.steps ?? []);
    return {
      code: ref.code,
      homeEngine: ref.homeEngine,
      engineName: config.engineName,
      seriesName: config.seriesName,
      kind: 'optimisation',
      summary: op,
      working: optimisationToPrompt(op),
      warnings: [...op.warnings, ...op.guidance],
    };
  }

  /* Weighted choice with sensitivity analysis — a score plus how fragile it is. */
  if (kind === 'selection') {
    const sel = computeSelection(input.options ?? [], input.criteria ?? []);
    return {
      code: ref.code,
      homeEngine: ref.homeEngine,
      engineName: config.engineName,
      seriesName: config.seriesName,
      kind: 'selection',
      summary: sel,
      working: selectionToPrompt(sel),
      warnings: [...sel.warnings, ...sel.guidance],
    };
  }

  /* Objectives checked pairwise — conflict is a property of pairs, so no
     per-objective score can surface it. */
  if (kind === 'conflict') {
    const cf = computeConflicts(input.objectives ?? []);
    return {
      code: ref.code,
      homeEngine: ref.homeEngine,
      engineName: config.engineName,
      seriesName: config.seriesName,
      kind: 'conflict',
      summary: cf,
      working: conflictsToPrompt(cf),
      warnings: [...cf.warnings, ...cf.guidance],
    };
  }

  switch (kind) {
    case 'assessment': {
      /* THE ENGINE ASSESSES ITS OWN DECLARED DIMENSIONS. Every registry
         entry names four dimensions specific to that module — the declared
         labels are authoritative: the caller supplies ratings, the engine
         supplies the questions. */
      summary = computeAssessment(alignToDimensions(config, input));
      working = assessmentToPrompt(summary);
      // The reviewer checks live on the summary; the result's top-level warnings are what the
      // app shows, so they were computed and then never seen.
      warnings.push(...summary.warnings);
      break;
    }

    case 'financial': {
      if (!input.periods)
        throw new EngineInputError('`periods` is required for a financial module.');
      summary = computeFinancials(input);
      working = financialsToPrompt(summary);
      break;
    }

    case 'roster': {
      const roles = arr(input.roles);
      if (roles.length === 0)
        throw new EngineInputError('`roles` is required for a roster module.');
      summary = computeRoster(roles);
      working = rosterToPrompt(summary);
      break;
    }

    case 'scenario': {
      const options = arr(input.options);
      if (options.length === 0)
        throw new EngineInputError('`options` is required for a scenario module.');
      summary = computeScenarios(options);
      working = scenariosToPrompt(summary);
      break;
    }

    case 'timeseries': {
      /* `computeSeriesStats` works one metric at a time, so a module with
         several tracked metrics is computed per series and the results
         collected. Accepts either a single `{metric, values}` or a `series`
         array of them. */
      const series = arr(
        input.series ?? (input.metric ? [{ metric: input.metric, values: input.values }] : []),
      );
      if (series.length === 0) {
        throw new EngineInputError(
          'A time-series module needs `series: [{ metric, values }]`, or a single `metric` with `values`.',
        );
      }

      const computed = series.map((s) => {
        const values = arr(s.values).map(Number).filter(Number.isFinite);
        if (values.length === 0)
          throw new EngineInputError('Each series needs at least one numeric value.');
        return computeSeriesStats(s.metric, values, s.target ?? null);
      });

      summary = computed.length === 1 ? computed[0] : computed;
      working = seriesStatsToPrompt(
        computed,
        typeof input.periodLabel === 'string' ? input.periodLabel : 'period',
      );
      break;
    }

    case 'narrative': {
      /* Narrative modules have no numeric compute by design. Say so rather
         than quietly handing the shape to a model — an engine that
         pretends to compute is worse than one that admits it does not. */
      warnings.push('This module is narrative: it structures input rather than scoring it.');
      summary = { narrative: input };
      working = JSON.stringify(input).slice(0, 4000);
      break;
    }

    default: {
      warnings.push(`Unknown input kind "${kind}" — fell back to assessment compute.`);
      const rows = arr(input.rows);
      if (rows.length === 0) throw new EngineInputError('`rows` is required.');
      summary = computeAssessment(rows);
      working = assessmentToPrompt(summary);
    }
  }

  return {
    code: ref.code,
    homeEngine: ref.homeEngine,
    engineName: config.engineName,
    seriesName: config.seriesName,
    kind,
    summary,
    working,
    warnings,
  };
}

/** Tool count per home engine, derived from the catalog rather than typed by hand. */
export function engineCountByHomeEngine() {
  const counts = {};
  for (const code of CATALOG_CODES) {
    const homeEngine = homeEngineFor(CODE_TO_TOOL[code]);
    counts[homeEngine] = (counts[homeEngine] ?? 0) + 1;
  }
  return counts;
}

const runInput = z.object({ input: z.record(z.string(), z.unknown()).default({}) }).strict();

/** Resolves a requested code for the routes: the tool it runs as, or the reason it does not. */
export function resolve(code) {
  const ref = parseEngineCode(code);
  if (!ref || !MODULE_REGISTRY[ref.code]) return { status: 404, error: 'Unknown engine code.' };
  const toolId = toolFor(ref);
  if (!toolId) {
    const r = retirement(ref.code);
    return {
      status: 410,
      error: r?.replacedBy
        ? `${r.reason} Use ${r.replacedBy.name} (${r.replacedBy.code}) instead.`
        : (r?.reason ?? 'This tool is no longer offered.'),
      retired: r,
    };
  }
  return { ref, toolId, primary: parseEngineCode(PRIMARY[toolId]) };
}

function manifestSummary(code) {
  const ref = parseEngineCode(code);
  const toolId = toolFor(ref);
  if (!toolId) return null;
  const tool = TOOLS[toolId];
  const primary = parseEngineCode(PRIMARY[toolId]);
  const spec = inputSpecFor(toolId);
  return {
    code: primary.code,
    toolId,
    homeEngine: primary.homeEngine,
    area: tool.area,
    seriesName: tool.area,
    engineName: tool.name,
    standard: tool.standard,
    purpose: tool.purpose,
    dimensionLabels: [],
    kind: spec.kind,
    ...describeEngine(primary),
    pointsCost: ENGINE_POINTS_COST,
    // Catalog id, and the canonical capabilities (T-001…T-202) this tool computes part of.
    // See toolCatalog/canonical.mjs: a link is partial, never acceptance.
    canonicalCapabilityId: toolId,
    canonicalCapabilities: TOOL_TO_CANONICAL[toolId] ?? [],
    // What has been established about this version of the tool — naming a method in `standard`
    // is not itself validation. See toolCatalog/validation.mjs.
    validation: validationFor(toolId),
  };
}

/** Original codes that now run as this tool (lower-case manifest ids). */
export const sourceIds = (toolId) =>
  Object.entries(CODE_TO_TOOL)
    .filter(([, t]) => t === toolId)
    .map(([c]) => c.toLowerCase());

/** Codes this workspace actually bought (bundle entitlements), lower-case. */
export async function purchasedIds(store, workspace) {
  const rows = await store.db
    .prepare('SELECT agent_id FROM workspace_agent_entitlements WHERE workspace_id = ?')
    .all(workspace.id);
  return new Set(rows.map((r) => r.agent_id.toLowerCase()));
}

/** Access to a tool follows its primary code's plan rules (tier, context rank, free, bought).
 * An original code merged into the tool also grants it, but only when it was actually bought —
 * never by context rank, so a merge can't move a tool down to a cheaper plan. */
function toolAccessible(accessibleCodes, purchased, toolId) {
  return accessibleCodes.has(PRIMARY[toolId]) || sourceIds(toolId).some((id) => purchased.has(id));
}

/** Catalog reads only — id/purpose/dimensions/points-cost, no workspace or user data anywhere in
 * this response. Mounted before the session gate (like mountPublicPricing) so the public
 * marketing pages (e.g. /product/intelligence) can show the real, full 248-tool catalog to a
 * logged-out visitor — "a user only learns of all the tools from the public-facing pages." The
 * in-app /os/engines catalog is a separate, authenticated, per-workspace-filtered route — see
 * mountEngines below — so a signed-in workspace only ever sees what its context/tier/bundles
 * actually grant, never the full unfiltered list.
 *
 * `POST /api/engines/:code/demo-run` is the one exception to "running requires a session": it's
 * the same real compute as the authenticated /run route, but with no charge, no persistence, and
 * no entitlement check — used only by the public /demo page ("Explore the workspace" used to drop
 * an anonymous visitor straight into a real /os session; it now sends them here instead, so a
 * visitor can see one genuine, correctly-computed result before ever creating an account). It's
 * still covered by this app's global per-IP rate limits (mounted before this in app.mjs). */
export function mountPublicEngines(app) {
  app.get('/api/engines/catalog', async (req, res) => {
    const filter = typeof req.query.engine === 'string' ? req.query.engine : null;
    const list = CATALOG_CODES.map(manifestSummary).filter(Boolean);
    res.json({
      engines: filter ? list.filter((m) => m.homeEngine === filter) : list,
      count: list.length,
    });
  });

  // Coverage report: tools per form (schema calculator/register, anchored questionnaire, or an
  // original archetype) and how many are built on a named method — all 63, by construction.
  app.get('/api/engines/catalog/coverage', async (req, res) => {
    const summaries = CATALOG_CODES.map(manifestSummary).filter(Boolean);
    const byKind = {};
    for (const entry of summaries) byKind[entry.kind] = (byKind[entry.kind] || 0) + 1;
    res.json({
      totalEntries: summaries.length,
      // Tools with current evidence for each validation state (not a single "verified" flag).
      validation: validationCoverage(),
      byArchetype: byKind,
      originalCodes: REGISTERED_CODES.length,
      stillRunning: Object.keys(CODE_TO_TOOL).length,
    });
  });

  app.post('/api/engines/:code/demo-run', async (req, res) => {
    // F-TF-02: only a code with a real registry entry is a real engine — never a fabricated
    // fallback config for an unregistered code.
    const r = resolve(req.params.code);
    if (r.error) return res.status(r.status).json({ error: r.error, retired: r.retired });
    const { input } = runInput.parse(req.body ?? {});
    const result = runEngine(r.ref, input);
    res.json({ result, demo: true });
  });

  app.get('/api/engines/:code', async (req, res) => {
    const r = resolve(req.params.code);
    if (r.error) return res.status(r.status).json({ error: r.error, retired: r.retired });
    const summary = manifestSummary(r.primary.code);
    const kind = TOOLS[r.toolId].engine === 'existing' ? TOOLS[r.toolId].kind : null;
    // A tool on an original archetype keeps that archetype's form spec (periods, metrics…).
    const config = configFor(r.primary);
    const inputs = kind ? { ...(config.inputs ?? {}), kind } : inputSpecFor(r.toolId);
    res.json({
      ...summary,
      ...(r.ref.code !== r.primary.code ? { requestedCode: r.ref.code } : {}),
      driverContext: null,
      correctionProtocols: [],
      inputs,
      // A worked example (illustrative figures) the form can load so the tool opens in a working state.
      example: EXAMPLES[r.toolId] ?? null,
      // The fixed question bank Q44 (decision-quality) is scored against — the frontend needs
      // this to render the form at all, since it isn't user-defined like the other archetypes.
      ...(kind === 'decision-quality'
        ? { decisionQuality: { requirements: REQUIREMENTS, questions: DQ_QUESTIONS } }
        : {}),
    });
  });
}

export function mountEngines(app, store) {
  // Authenticated and per-workspace filtered — see accessibleEngineCodes in entitlements.mjs.
  // Distinct from the public /api/engines/catalog route (mountPublicEngines above), which always
  // returns the full 248-tool list for marketing/education purposes.
  app.get('/api/engines', async (req, res) => {
    const filter = typeof req.query.engine === 'string' ? req.query.engine : null;
    const accessible = await accessibleEngineCodes(store, req.workspace);
    const purchased = await purchasedIds(store, req.workspace);
    const open = (code) => toolAccessible(accessible, purchased, CODE_TO_TOOL[code]);
    const list = CATALOG_CODES.filter(open).map(manifestSummary).filter(Boolean);
    // Engine seats: a locked engine used to be silently omitted, so a workspace had no way to
    // discover it exists at all. Surfaced here (never fetched, never counted as "count") so the
    // catalog page can show what it's missing and link to the seat bundle that would unlock it.
    const locked = CATALOG_CODES.filter((code) => !open(code))
      .map(manifestSummary)
      .filter(Boolean);
    res.json({
      engines: filter ? list.filter((m) => m.homeEngine === filter) : list,
      count: list.length,
      locked: filter ? locked.filter((m) => m.homeEngine === filter) : locked,
    });
  });

  // POST /api/engines/:code/run is mounted by capabilities.mjs (mountCapabilityRuns): the UI,
  // agents and workflows share one execution path for checks, charging and lineage.
}
