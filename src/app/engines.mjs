import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { requirePermission } from './policy.mjs';
import { hasToolAccess } from './entitlements.mjs';
import { getModuleConfig, MODULE_REGISTRY, buildFallbackConfig, ENGINE_CODES } from './engineRegistry.mjs';
import { computeAssessment, assessmentToPrompt } from './engineIntelligence/assessment.mjs';
import { computeDecisionQuality, decisionQualityToPrompt, DQ_QUESTIONS, REQUIREMENTS } from './engineIntelligence/decisionQuality.mjs';
import { computeGrowthPathways, growthPathwaysToPrompt } from './engineIntelligence/growthPathways.mjs';
import { computeBenchStrength, benchStrengthToPrompt } from './engineIntelligence/benchStrength.mjs';
import { computeScenarioDecision, scenarioDecisionToPrompt } from './engineIntelligence/scenarioDecision.mjs';
import { computeRoadmap, roadmapToPrompt } from './engineIntelligence/roadmap.mjs';
import { computeOptimisation, optimisationToPrompt } from './engineIntelligence/optimisation.mjs';
import { computeSelection, selectionToPrompt } from './engineIntelligence/selector.mjs';
import { computeConflicts, conflictsToPrompt } from './engineIntelligence/conflict.mjs';
import { computeFinancials, financialsToPrompt } from './engineIntelligence/financial.mjs';
import { computeRoster, rosterToPrompt } from './engineIntelligence/roster.mjs';
import { computeScenarios, scenariosToPrompt } from './engineIntelligence/scenario.mjs';
import { computeSeriesStats, seriesStatsToPrompt } from './engineIntelligence/inputSpec.mjs';

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

/** Which of this app's canonical engine names a module series rolls up into. */
const SERIES_TO_HOME_ENGINE = {
  S: 'Clarity', Q: 'Clarity',
  R: 'Consistency', P: 'Consistency', X: 'Consistency',
  Z: 'Growth', G: 'Growth',
  A: 'Capability',
  F: 'Finance', C: 'Finance',
};

/** Flat points cost per engine run — cheaper than the AI-backed chat agents (65pts)
 *  since no model call is involved. A placeholder judgment call, not derived from
 *  either source project (LamidOne priced these via subscription tier, not points). */
export const ENGINE_POINTS_COST = 35;

/** `q44` / `Q44` → normalised reference, or null when not a module code.
 *  2-3 digits: the registry runs past 99 for one series (Q01-Q100), which the LamidOne
 *  source's own `\d{2}`-only regex could not actually reach — widened here rather than
 *  porting that gap forward. */
export function parseEngineCode(input) {
  const m = /^([A-Za-z])(\d{2,3})$/.exec(String(input).trim());
  if (!m) return null;
  const series = m[1].toUpperCase();
  return { code: `${series}${m[2]}`, series, homeEngine: SERIES_TO_HOME_ENGINE[series] ?? 'Shared' };
}

export function configFor(ref) {
  return (
    getModuleConfig?.(ref.code) ??
    MODULE_REGISTRY[ref.code] ??
    buildFallbackConfig(ref.code, `${ref.series}-Series`, `${ref.code} Engine`)
  );
}

export const REGISTERED_CODES = ENGINE_CODES;

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

    return {
      id: String(i + 1),
      label,
      rating: clamp(match.rating, 0, 5, 0),
      weight: clamp(match.weight, 1, 3, 2),
      evidence: clamp(match.evidence, 0, 2, 0),
      ...(match.note ? { note: String(match.note).slice(0, 400) } : {}),
    };
  });

  if (rows.every((r) => r.rating === 0)) {
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
export function runEngine(ref, input) {
  const config = configFor(ref);
  const kind = config.inputs?.kind ?? 'assessment';
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
      code: ref.code, homeEngine: ref.homeEngine,
      engineName: config.engineName, seriesName: config.seriesName,
      kind: 'decision-quality',
      summary: dq,
      working: decisionQualityToPrompt(dq),
      warnings: [...dq.confidenceFlags, ...(dq.fatalIssues.length ? [`Fatal gaps: ${dq.fatalIssues.join('; ')}`] : [])],
    };
  }

  /* G03 compares candidate pathways against each other and returns a
     sequenced portfolio under a capacity constraint — a recommendation, not
     a score. */
  if (kind === 'growth-pathways') {
    const gp = computeGrowthPathways(input.pathways ?? [], Number(input.capacity) || 3);
    return {
      code: ref.code, homeEngine: ref.homeEngine,
      engineName: config.engineName, seriesName: config.seriesName,
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
      code: ref.code, homeEngine: ref.homeEngine,
      engineName: config.engineName, seriesName: config.seriesName,
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
      code: ref.code, homeEngine: ref.homeEngine,
      engineName: config.engineName, seriesName: config.seriesName,
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
      code: ref.code, homeEngine: ref.homeEngine,
      engineName: config.engineName, seriesName: config.seriesName,
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
      code: ref.code, homeEngine: ref.homeEngine,
      engineName: config.engineName, seriesName: config.seriesName,
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
      code: ref.code, homeEngine: ref.homeEngine,
      engineName: config.engineName, seriesName: config.seriesName,
      kind: 'selection', summary: sel, working: selectionToPrompt(sel),
      warnings: [...sel.warnings, ...sel.guidance],
    };
  }

  /* Objectives checked pairwise — conflict is a property of pairs, so no
     per-objective score can surface it. */
  if (kind === 'conflict') {
    const cf = computeConflicts(input.objectives ?? []);
    return {
      code: ref.code, homeEngine: ref.homeEngine,
      engineName: config.engineName, seriesName: config.seriesName,
      kind: 'conflict', summary: cf, working: conflictsToPrompt(cf),
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
      break;
    }

    case 'financial': {
      if (!input.periods) throw new EngineInputError('`periods` is required for a financial module.');
      summary = computeFinancials(input);
      working = financialsToPrompt(summary);
      break;
    }

    case 'roster': {
      const roles = arr(input.roles);
      if (roles.length === 0) throw new EngineInputError('`roles` is required for a roster module.');
      summary = computeRoster(roles);
      working = rosterToPrompt(summary);
      break;
    }

    case 'scenario': {
      const options = arr(input.options);
      if (options.length === 0) throw new EngineInputError('`options` is required for a scenario module.');
      summary = computeScenarios(options);
      working = scenariosToPrompt(summary);
      break;
    }

    case 'timeseries': {
      /* `computeSeriesStats` works one metric at a time, so a module with
         several tracked metrics is computed per series and the results
         collected. Accepts either a single `{metric, values}` or a `series`
         array of them. */
      const series = arr(input.series ?? (input.metric ? [{ metric: input.metric, values: input.values }] : []));
      if (series.length === 0) {
        throw new EngineInputError(
          'A time-series module needs `series: [{ metric, values }]`, or a single `metric` with `values`.',
        );
      }

      const computed = series.map((s) => {
        const values = arr(s.values).map(Number).filter(Number.isFinite);
        if (values.length === 0) throw new EngineInputError('Each series needs at least one numeric value.');
        return computeSeriesStats(s.metric, values, s.target ?? null);
      });

      summary = computed.length === 1 ? computed[0] : computed;
      working = seriesStatsToPrompt(computed, typeof input.periodLabel === 'string' ? input.periodLabel : 'period');
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

  return { code: ref.code, homeEngine: ref.homeEngine, engineName: config.engineName, seriesName: config.seriesName, kind, summary, working, warnings };
}

/** Engine count per home engine, derived from the registry rather than typed by hand. */
export function engineCountByHomeEngine() {
  const counts = {};
  for (const code of REGISTERED_CODES) {
    const homeEngine = SERIES_TO_HOME_ENGINE[code[0]] ?? 'Shared';
    counts[homeEngine] = (counts[homeEngine] ?? 0) + 1;
  }
  return counts;
}

const runInput = z.object({ input: z.record(z.string(), z.unknown()).default({}) }).strict();

function manifestSummary(code) {
  const ref = parseEngineCode(code);
  if (!ref) return null;
  const config = configFor(ref);
  return {
    code: ref.code,
    homeEngine: ref.homeEngine,
    seriesName: config.seriesName,
    engineName: config.engineName,
    purpose: config.purpose,
    dimensionLabels: config.dimensionLabels,
    kind: config.inputs?.kind ?? 'assessment',
    pointsCost: ENGINE_POINTS_COST,
  };
}

/** Catalog reads only — id/purpose/dimensions/points-cost, no workspace or user data anywhere in
 * this response. Mounted before the session gate (like mountPublicPricing) so both the signed-in
 * /os/engines page and the public marketing pages (e.g. /product/intelligence) can show the real
 * 248-tool catalog to a logged-out visitor. Running an engine still requires a session — see
 * mountEngines below. */
export function mountPublicEngines(app) {
  app.get('/api/engines', async (req, res) => {
    const filter = typeof req.query.engine === 'string' ? req.query.engine : null;
    const list = REGISTERED_CODES.map(manifestSummary).filter(Boolean);
    res.json({ engines: filter ? list.filter((m) => m.homeEngine === filter) : list, count: list.length });
  });

  app.get('/api/engines/:code', async (req, res) => {
    const ref = parseEngineCode(req.params.code);
    if (!ref) return res.status(404).json({ error: 'Unknown engine code.' });
    const config = configFor(ref);
    const kind = config.inputs?.kind ?? 'assessment';
    res.json({
      code: ref.code,
      homeEngine: ref.homeEngine,
      seriesName: config.seriesName,
      engineName: config.engineName,
      purpose: config.purpose,
      dimensionLabels: config.dimensionLabels,
      driverContext: config.driverContext,
      correctionProtocols: config.correctionProtocols,
      inputs: config.inputs,
      pointsCost: ENGINE_POINTS_COST,
      // The fixed question bank Q44 (decision-quality) is scored against — the frontend needs
      // this to render the form at all, since it isn't user-defined like the other archetypes.
      ...(kind === 'decision-quality' ? { decisionQuality: { requirements: REQUIREMENTS, questions: DQ_QUESTIONS } } : {}),
    });
  });
}

export function mountEngines(app, store) {
  const { db, transaction, log } = store;

  app.post('/api/engines/:code/run', requirePermission('work:write'), async (req, res) => {
    const ref = parseEngineCode(req.params.code);
    if (!ref) return res.status(404).json({ error: 'Unknown engine code.' });
    const manifestId = ref.code.toLowerCase();
    const manifest = await db.prepare('SELECT id, points_cost FROM agent_manifests WHERE id = ?').get(manifestId);
    if (!manifest) return res.status(404).json({ error: 'This engine is not yet available.' });
    // Real entitlement gate — enterprise tier, a free tool, or an actually-purchased bundle. See
    // src/app/entitlements.mjs. Checked before compute/charge, same pattern as agents.mjs's send().
    if (!(await hasToolAccess(store, req.workspace, manifestId)))
      return res.status(403).json({ error: "This engine isn't included in your plan. Purchase a bundle that includes it, or upgrade to Enterprise." });
    const { input } = runInput.parse(req.body ?? {});

    const points = manifest.points_cost || 0;
    const runId = randomUUID();
    const createdAt = new Date().toISOString();

    // Validate BEFORE charging — a malformed request must cost nothing. runEngine() itself
    // throws EngineInputError synchronously for bad input, so calling it once here and
    // reusing the result (rather than calling it again after charging) also avoids ever
    // charging for a run whose compute step is about to fail.
    const result = runEngine(ref, input);

    await transaction(async () => {
      if (points > 0) {
        const charged = await db
          .prepare('UPDATE users SET points_balance = points_balance - ? WHERE id = ? AND points_balance >= ?')
          .run(points, req.user.id, points);
        if (charged.changes !== 1)
          throw Object.assign(new Error('You do not have enough points for this engine.'), { status: 402 });
        await db
          .prepare('INSERT INTO points_ledger VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(randomUUID(), req.user.id, req.workspace.id, -points, 'agent_run', runId, Date.now());
      }
      await db.prepare('INSERT INTO agent_runs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
        runId, req.workspace.id, req.user.id, manifestId,
        JSON.stringify(input), JSON.stringify(result), 'completed', createdAt, createdAt,
      );
    });

    const balance = (await db.prepare('SELECT points_balance FROM users WHERE id = ?').get(req.user.id)).points_balance;
    await log(req.workspace.id, req.user.name, 'Engine run', runId, ref.code);
    res.json({ runId, pointsCharged: points, balance, result });
  });
}
