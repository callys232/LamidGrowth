/**
 * CONSTRAINT OPTIMISATION — the engine behind the optimisation modules
 * (P14 Productivity, P21 Process, F04 Cost Optimization).
 *
 * ────────────────────────────────────────────────────────────────
 * WHY "SCORE EACH STEP AND IMPROVE THE WORST" IS WRONG
 *
 * These modules promise optimisation. The assessment archetype scores
 * each step of a process independently and points at the lowest score
 * — which is the single most expensive mistake in operations, because
 * IMPROVING A NON-BOTTLENECK IMPROVES NOTHING.
 *
 * Throughput is set by the constraint. Spend on any other step and the
 * work simply queues somewhere else; the money is gone and the output
 * is unchanged. Worse, improving a step feeding the bottleneck makes
 * things actively worse by growing the queue in front of it.
 *
 * So this engine:
 *   · finds the CONSTRAINT (lowest effective capacity),
 *   · computes what the whole system can actually produce,
 *   · calculates the gain from relieving the constraint AND the point
 *     at which the constraint moves elsewhere — because there is no
 *     value in relieving it past the next-tightest step,
 *   · explicitly reports which improvements would be WASTED.
 *
 * Cost work follows the same logic in a different unit: cutting a cost
 * that is not binding on anything is a saving, but cutting one that
 * feeds the constraint reduces output by more than it saves.
 * ────────────────────────────────────────────────────────────────
 */

/**
 * @typedef {Object} ProcessStep
 * @property {string} id
 * @property {string} name
 * @property {number} capacity Units this step can process per period at full effectiveness.
 * @property {number} efficiencyPct 0–100. Yield, uptime or quality — capacity you nominally have but
 *   do not get. Effective capacity = capacity × efficiency.
 * @property {number} [cost] Cost to run this step per period. Optional; enables cost analysis.
 * @property {number} [costPerUnitUplift] Cost to add one unit of capacity here. Drives the payback ranking.
 */

/**
 * @typedef {Object} StepAnalysis
 * @property {string} id
 * @property {string} name
 * @property {number} capacity
 * @property {number} efficiencyPct
 * @property {number} effectiveCapacity
 * @property {number} utilisationPct Share of effective capacity actually used, given system throughput.
 * @property {number} idleCapacity Effective capacity above system throughput — capacity you paid for
 *   and cannot use while the constraint holds.
 * @property {boolean} isConstraint
 * @property {number|null} costPerUnitOutput Cost per unit of ACTUAL output, not of nominal capacity.
 */

/**
 * @typedef {Object} UpliftOption
 * @property {string} stepId
 * @property {string} name
 * @property {number} maxUsefulUplift Extra throughput gained before the constraint moves elsewhere.
 * @property {number} newThroughput Throughput after relieving this step to the next-tightest level.
 * @property {number|null} cost
 * @property {number|null} costPerUnitGained Cost per unit of extra throughput. Null when no cost supplied.
 * @property {string} note
 */

/**
 * @typedef {Object} OptimisationResult
 * @property {StepAnalysis[]} steps
 * @property {number} throughput
 * @property {StepAnalysis|null} constraint
 * @property {StepAnalysis|null} nextConstraint Where the constraint moves once the current one is relieved.
 * @property {UpliftOption[]} upliftOptions Uplift worth buying, best payback first.
 * @property {{name:string,why:string}[]} wastedImprovements Improvements that would change nothing — named explicitly.
 * @property {number|null} totalCost
 * @property {number|null} costPerUnit
 * @property {number} totalIdleCapacity Capacity paid for and unusable while the constraint holds.
 * @property {number|null} idleCostEstimate
 * @property {string} headline
 * @property {string[]} guidance
 * @property {string[]} warnings
 */

const r1 = (n) => Math.round(n * 10) / 10;
const r2 = (n) => Math.round(n * 100) / 100;
const num = (v, d = 0) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : d;
};

/** @param {ProcessStep[]} stepsIn */
export function computeOptimisation(stepsIn) {
  const warnings = [];
  const guidance = [];

  const raw = (stepsIn ?? []).filter((s) => s?.name?.trim());
  if (raw.length === 0) {
    return {
      steps: [], throughput: 0, constraint: null, nextConstraint: null,
      upliftOptions: [], wastedImprovements: [], totalCost: null, costPerUnit: null,
      totalIdleCapacity: 0, idleCostEstimate: null,
      headline: 'No process steps to analyse.',
      guidance: [], warnings: ['Add the steps of the process, in order, with the capacity of each.'],
    };
  }
  if (raw.length === 1) {
    warnings.push('A single step cannot have a constraint relative to anything else. Add the steps around it.');
  }

  const effective = raw.map((s) => ({
    ...s,
    eff: Math.max(0, num(s.capacity)) * (Math.min(100, Math.max(0, num(s.efficiencyPct, 100))) / 100),
  }));

  /* Throughput of a series process is the minimum effective capacity.
     Everything downstream of the constraint starves; everything
     upstream builds queue. */
  const throughput = r1(Math.min(...effective.map((s) => s.eff)));

  const steps = effective.map((s) => {
    const isConstraint = Math.abs(s.eff - throughput) < 1e-9;
    const cost = s.cost !== undefined ? num(s.cost) : null;
    return {
      id: s.id, name: s.name.trim(),
      capacity: r1(num(s.capacity)),
      efficiencyPct: r1(num(s.efficiencyPct, 100)),
      effectiveCapacity: r1(s.eff),
      utilisationPct: s.eff > 0 ? r1((throughput / s.eff) * 100) : 0,
      idleCapacity: r1(Math.max(0, s.eff - throughput)),
      isConstraint,
      costPerUnitOutput: cost !== null && throughput > 0 ? r2(cost / throughput) : null,
    };
  });

  const constraint = steps.find((s) => s.isConstraint) ?? null;

  /* Where the constraint moves once this one is relieved — the ceiling
     on any single improvement. */
  const sortedEff = [...steps].sort((a, b) => a.effectiveCapacity - b.effectiveCapacity);
  const nextConstraint = sortedEff.find((s) => s.effectiveCapacity > throughput + 1e-9) ?? null;
  const ceiling = nextConstraint?.effectiveCapacity ?? throughput;

  /* ── Uplift options ──
     Only the constraint is worth relieving, and only up to the next
     bottleneck. Everything else is listed as waste, explicitly. */
  const upliftOptions = [];
  const wastedImprovements = [];

  for (const s of steps) {
    if (s.isConstraint) {
      const gain = r1(Math.max(0, ceiling - throughput));
      const src = raw.find((x) => x.id === s.id);
      const cpu = src?.costPerUnitUplift !== undefined ? num(src.costPerUnitUplift) : null;
      upliftOptions.push({
        stepId: s.id, name: s.name,
        maxUsefulUplift: gain,
        newThroughput: r1(ceiling),
        cost: cpu !== null ? r2(cpu * gain) : null,
        costPerUnitGained: cpu,
        note: gain > 0
          ? `Relieving this lifts system output to ${r1(ceiling)} — at which point ${nextConstraint?.name ?? 'another step'} becomes the constraint. Buying capacity beyond that is wasted.`
          : `Every step has the same effective capacity, so relieving this alone gains nothing. Lift them together or not at all.`,
      });
    } else {
      wastedImprovements.push({
        name: s.name,
        why: `Already has ${s.idleCapacity} units of unused capacity. Improving it adds queue in front of ${constraint?.name ?? 'the constraint'} and no output.`,
      });
    }
  }

  upliftOptions.sort((a, b) => {
    if (a.costPerUnitGained !== null && b.costPerUnitGained !== null) return a.costPerUnitGained - b.costPerUnitGained;
    return b.maxUsefulUplift - a.maxUsefulUplift;
  });

  /* ── Cost ── */
  const costed = raw.filter((s) => s.cost !== undefined);
  const totalCost = costed.length > 0 ? r2(costed.reduce((sum, s) => sum + num(s.cost), 0)) : null;
  const costPerUnit = totalCost !== null && throughput > 0 ? r2(totalCost / throughput) : null;

  const totalIdleCapacity = r1(steps.reduce((s, x) => s + x.idleCapacity, 0));

  /* Money tied up in capacity that cannot be used while the constraint
     holds — usually the most persuasive number in the whole analysis. */
  let idleCostEstimate = null;
  if (costed.length === raw.length && throughput > 0) {
    idleCostEstimate = r2(steps.reduce((sum, s) => {
      const c = num(raw.find((x) => x.id === s.id)?.cost);
      const idleShare = s.effectiveCapacity > 0 ? s.idleCapacity / s.effectiveCapacity : 0;
      return sum + c * idleShare;
    }, 0));
  }

  /* ── Guidance ── */
  if (constraint) {
    guidance.push(`${constraint.name} sets system output at ${throughput} units. Nothing else changes that number.`);
    if (nextConstraint) {
      guidance.push(`Relieving it is worth doing only up to ${r1(ceiling)} units — beyond that ${nextConstraint.name} binds instead, and further spend on ${constraint.name} buys nothing.`);
    }
  }
  if (wastedImprovements.length > 0) {
    guidance.push(`${wastedImprovements.length} step${wastedImprovements.length > 1 ? 's are' : ' is'} already faster than the system can use. Effort spent there produces queue, not output.`);
  }
  if (idleCostEstimate !== null && idleCostEstimate > 0) {
    guidance.push(`Roughly ${idleCostEstimate} per period is spent on capacity the constraint prevents you from using.`);
  }

  const lowEff = steps.filter((s) => s.efficiencyPct < 70);
  if (lowEff.length > 0) {
    guidance.push(`${lowEff.map((s) => s.name).join(', ')} run below 70% effectiveness. Recovering lost efficiency is usually far cheaper than buying capacity, and on the constraint it has the same effect.`);
  }
  if (constraint && constraint.efficiencyPct < 90) {
    guidance.push(`The constraint itself runs at ${constraint.efficiencyPct}% effectiveness — fix that before buying more of it. You are already paying for capacity you are not getting.`);
  }

  const spread = sortedEff.length > 1
    ? sortedEff[sortedEff.length - 1].effectiveCapacity - sortedEff[0].effectiveCapacity : 0;
  if (spread === 0 && steps.length > 1) {
    warnings.push('Every step has identical effective capacity — a balanced line. It maximises utilisation but has no absorption for variability, so any disruption stops output immediately.');
  }
  if (steps.some((s) => s.capacity <= 0)) {
    warnings.push('At least one step has zero capacity, which stops the process entirely. Check the inputs.');
  }

  const headline = constraint
    ? `${constraint.name} is the constraint. System output is ${throughput} units per period${nextConstraint ? `, and can reach ${r1(ceiling)} before ${nextConstraint.name} takes over` : ''}.`
    : 'No constraint identified.';

  return {
    steps, throughput, constraint, nextConstraint,
    upliftOptions, wastedImprovements,
    totalCost, costPerUnit, totalIdleCapacity, idleCostEstimate,
    headline, guidance, warnings,
  };
}

/** Deterministic summary the model reads — it never recomputes these. */
export function optimisationToPrompt(r) {
  const lines = [`• ${r.headline}`];
  for (const s of r.steps) {
    lines.push(`• ${s.name}: effective ${s.effectiveCapacity}, utilisation ${s.utilisationPct}%${s.isConstraint ? ' ← CONSTRAINT' : `, idle ${s.idleCapacity}`}`);
  }
  for (const u of r.upliftOptions) lines.push(`• UPLIFT ${u.name}: +${u.maxUsefulUplift} useful, ${u.note}`);
  for (const w of r.wastedImprovements) lines.push(`• WASTED IF IMPROVED: ${w.name} — ${w.why}`);
  for (const g of r.guidance) lines.push(`• ${g}`);
  return lines.join('\n');
}
