/**
 * ROADMAP SEQUENCING — the engine behind the planner modules
 * (A03, A26, C06, G04, G07, Q31, Q56).
 *
 * ────────────────────────────────────────────────────────────────
 * WHY A RANKED LIST IS NOT A PLAN
 *
 * Every module in this group promises a PLAN. The shared assessment
 * archetype produces a score; the obvious alternative, "rank the
 * initiatives by value", produces a wish list. Neither is a plan,
 * because a plan has to survive three constraints a ranking ignores:
 *
 *   1. DEPENDENCIES. Some work cannot start until other work finishes.
 *      A ranking that puts a dependent item before its prerequisite is
 *      not merely suboptimal, it is impossible.
 *
 *   2. CAPACITY PER PERIOD. Effort is bounded in each period, not in
 *      aggregate. Ten initiatives that "fit the year" but all need the
 *      same quarter do not fit.
 *
 *   3. ORDERING WITHIN THE CONSTRAINTS. Once dependencies and capacity
 *      are respected there is still a choice, and value-per-unit-effort
 *      beats raw value — finishing three cheap high-value items before
 *      one expensive one delivers benefit earlier and keeps optionality.
 *
 * The output is therefore a PHASED SCHEDULE with each item placed in a
 * period, plus everything that did not fit and why. Critical-path
 * length is reported because it is the floor on delivery time that no
 * amount of extra capacity can compress.
 * ────────────────────────────────────────────────────────────────
 */

/**
 * @typedef {Object} Initiative
 * @property {string} id
 * @property {string} name
 * @property {number} value 0–5 benefit if delivered.
 * @property {number} effort Effort in whatever unit `capacityPerPeriod` uses — points, FTE-months.
 * @property {string[]} [dependsOn] Ids that must COMPLETE before this can start.
 * @property {boolean} [mandatory] Cannot be deferred — placed even if it crowds out higher-value work.
 * @property {number} [earliestPeriod] Optional: earliest period this can begin (1-based).
 */

/**
 * @typedef {Object} ScheduledItem
 * @property {string} id
 * @property {string} name
 * @property {number} period
 * @property {number} value
 * @property {number} effort
 * @property {number} ratio Value per unit of effort — the ordering key within a period.
 * @property {boolean} mandatory
 * @property {string} reason Why it landed in this period rather than earlier.
 * @property {boolean} dependencyBound True when a dependency, not capacity, set the start.
 */

/**
 * @typedef {Object} UnscheduledItem
 * @property {string} id
 * @property {string} name
 * @property {string} why
 */

/**
 * @typedef {Object} PeriodPlan
 * @property {number} period
 * @property {ScheduledItem[]} items
 * @property {number} effortUsed
 * @property {number} capacity
 * @property {number} utilisationPct
 * @property {number} valueDelivered
 */

/**
 * @typedef {Object} RoadmapResult
 * @property {PeriodPlan[]} periods
 * @property {UnscheduledItem[]} unscheduled
 * @property {number} criticalPathLength Longest chain of dependencies — the floor on delivery time.
 * @property {string[]} criticalPath
 * @property {number} totalValue
 * @property {number} scheduledValue
 * @property {number} valueCapturedPct
 * @property {number|null} valueMedianPeriod Period by which half the total value has landed. Earlier is better.
 * @property {string} headline
 * @property {string[]} guidance
 * @property {string[]} warnings
 */

const r1 = (n) => Math.round(n * 10) / 10;
const num = (v, d = 0) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : d;
};

/**
 * @param {Initiative[]} initiativesIn
 * @param {number} [periods]
 * @param {number} [capacityPerPeriod]
 * @param {string} [periodLabel]
 */
export function computeRoadmap(
  initiativesIn,
  periods = 4,
  capacityPerPeriod = 10,
  periodLabel = 'Quarter',
) {
  const warnings = [];
  const guidance = [];

  const items = (initiativesIn ?? []).filter((i) => i?.name?.trim() && i?.id);
  const P = Math.max(1, Math.floor(periods) || 1);
  const CAP = Math.max(0.1, num(capacityPerPeriod, 10));

  if (items.length === 0) {
    return {
      periods: [], unscheduled: [], criticalPathLength: 0, criticalPath: [],
      totalValue: 0, scheduledValue: 0, valueCapturedPct: 0, valueMedianPeriod: null,
      headline: 'Nothing to schedule yet.',
      guidance: [], warnings: ['Add initiatives to sequence.'],
    };
  }

  const byId = new Map(items.map((i) => [i.id, i]));

  /* ── Dependency validation ──
     A missing prerequisite is dropped rather than silently ignored: a
     schedule built on a dependency that does not exist is a schedule
     nobody can follow. A CYCLE is fatal for the items in it — no
     ordering satisfies it — so they are excluded and named. */
  for (const i of items) {
    const missing = (i.dependsOn ?? []).filter((d) => !byId.has(d));
    if (missing.length) {
      warnings.push(`"${i.name}" depends on ${missing.length} item(s) that are not in the list. Those links were ignored.`);
    }
  }

  const deps = (id) => (byId.get(id)?.dependsOn ?? []).filter((d) => byId.has(d));

  /* Longest dependency chain, via memoised depth-first descent. Also
     detects cycles — a node that reappears in its own descent. */
  const depthCache = new Map();
  const chainCache = new Map();
  const cyclic = new Set();

  const depth = (id, seen) => {
    if (seen.has(id)) { cyclic.add(id); return 0; }
    if (depthCache.has(id)) return depthCache.get(id);
    const next = new Set(seen); next.add(id);
    let best = 0; let bestChain = [];
    for (const d of deps(id)) {
      const dd = depth(d, next);
      if (dd + 1 > best) { best = dd + 1; bestChain = [...(chainCache.get(d) ?? [d])]; }
    }
    depthCache.set(id, best);
    chainCache.set(id, [...bestChain, id]);
    return best;
  };
  for (const i of items) depth(i.id, new Set());

  if (cyclic.size > 0) {
    warnings.push(`Circular dependency involving: ${[...cyclic].map((id) => byId.get(id)?.name ?? id).join(', ')}. No ordering can satisfy it — those items were excluded.`);
  }

  const schedulable = items.filter((i) => !cyclic.has(i.id));

  let criticalPathLength = 0;
  let criticalPath = [];
  for (const i of schedulable) {
    const d = (depthCache.get(i.id) ?? 0) + 1;
    if (d > criticalPathLength) {
      criticalPathLength = d;
      criticalPath = (chainCache.get(i.id) ?? [i.id]).map((id) => byId.get(id)?.name ?? id);
    }
  }

  /* ── Greedy scheduling, period by period ──
     Within each period, place whatever is eligible (dependencies met,
     not before its earliest period) in order of value-per-effort, with
     mandatory work first. Greedy rather than exhaustive on purpose: an
     optimal packing is NP-hard, the inputs are estimates to one decimal
     place, and a plan nobody can follow the reasoning of is worse than
     a good one they can. */
  const completedBy = new Map();
  const scheduled = [];
  const remaining = new Set(schedulable.map((i) => i.id));
  const plans = [];

  for (let p = 1; p <= P; p++) {
    let used = 0;
    const placed = [];

    const eligible = () => [...remaining]
      .map((id) => byId.get(id))
      .filter((i) => {
        if (num(i.earliestPeriod, 1) > p) return false;
        return deps(i.id).every((d) => (completedBy.get(d) ?? Infinity) < p);
      })
      .sort((a, b) => {
        if (Boolean(b.mandatory) !== Boolean(a.mandatory)) return Number(Boolean(b.mandatory)) - Number(Boolean(a.mandatory));
        const ra = num(a.value) / Math.max(0.1, num(a.effort, 1));
        const rb = num(b.value) / Math.max(0.1, num(b.effort, 1));
        return rb - ra;
      });

    for (const i of eligible()) {
      const effort = Math.max(0, num(i.effort, 1));
      if (used + effort > CAP) continue;         // try the next, smaller item
      used += effort;
      const depBound = deps(i.id).some((d) => (completedBy.get(d) ?? 0) === p - 1);
      const item = {
        id: i.id, name: i.name.trim(), period: p,
        value: num(i.value), effort,
        ratio: r1(num(i.value) / Math.max(0.1, effort)),
        mandatory: Boolean(i.mandatory),
        dependencyBound: depBound,
        reason: depBound
          ? `Earliest possible — a prerequisite finished in ${periodLabel.toLowerCase()} ${p - 1}.`
          : i.mandatory
            ? 'Mandatory, placed ahead of higher-ratio work.'
            : `Highest value per unit of effort among what fits.`,
      };
      placed.push(item);
      scheduled.push(item);
      remaining.delete(i.id);
    }

    for (const i of placed) completedBy.set(i.id, p);

    plans.push({
      period: p, items: placed, effortUsed: r1(used), capacity: CAP,
      utilisationPct: r1((used / CAP) * 100),
      valueDelivered: r1(placed.reduce((s, x) => s + x.value, 0)),
    });
  }

  /* ── What did not fit ── */
  const unscheduled = [];
  for (const id of remaining) {
    const i = byId.get(id);
    const unmet = deps(id).filter((d) => !completedBy.has(d));
    const effort = Math.max(0, num(i.effort, 1));
    unscheduled.push({
      id, name: i.name,
      why: effort > CAP
        ? `Needs ${effort} effort but a ${periodLabel.toLowerCase()} only holds ${CAP}. Split it or raise capacity.`
        : unmet.length > 0
          ? `Blocked — ${unmet.map((d) => byId.get(d)?.name ?? d).join(', ')} never got scheduled.`
          : `No capacity left across the ${P} ${periodLabel.toLowerCase()}s planned.`,
    });
  }
  for (const id of cyclic) {
    const i = byId.get(id);
    unscheduled.push({ id, name: i.name, why: 'Part of a circular dependency — cannot be ordered.' });
  }

  const totalValue = r1(items.reduce((s, i) => s + num(i.value), 0));
  const scheduledValue = r1(scheduled.reduce((s, i) => s + i.value, 0));

  /* Period by which half the DELIVERED value has landed — a plan that
     back-loads its benefit is materially worse than one that front-loads
     the same total, and a value total alone cannot show that. */
  let cum = 0;
  let valueMedianPeriod = null;
  for (const p of plans) {
    cum += p.valueDelivered;
    if (valueMedianPeriod === null && scheduledValue > 0 && cum >= scheduledValue / 2) {
      valueMedianPeriod = p.period;
    }
  }

  /* ── Guidance ── */
  if (criticalPathLength > P) {
    guidance.push(`The dependency chain is ${criticalPathLength} ${periodLabel.toLowerCase()}s long but only ${P} are planned. No amount of extra capacity compresses this — the chain is the floor. Break a dependency or extend the horizon.`);
  }
  const avgUtil = plans.length ? plans.reduce((s, p) => s + p.utilisationPct, 0) / plans.length : 0;
  if (avgUtil > 95) {
    guidance.push(`Average utilisation is ${r1(avgUtil)}%. A plan with no slack absorbs no surprises — the first delay cascades through everything behind it.`);
  } else if (avgUtil < 45 && unscheduled.length === 0) {
    guidance.push(`Average utilisation is only ${r1(avgUtil)}%. There is room for more, or the horizon can be shortened.`);
  }
  if (valueMedianPeriod !== null && valueMedianPeriod > Math.ceil(P / 2)) {
    guidance.push(`Half the value does not land until ${periodLabel.toLowerCase()} ${valueMedianPeriod} of ${P}. The plan is back-loaded — check whether anything valuable can be pulled forward.`);
  }
  const firstEmpty = plans.find((p) => p.items.length === 0);
  if (firstEmpty && scheduled.length > 0) {
    guidance.push(`${periodLabel} ${firstEmpty.period} is empty while work remains unscheduled — usually a dependency stall rather than a capacity one.`);
  }

  const headline = scheduled.length === 0
    ? 'Nothing could be scheduled — every item is blocked, oversized or out of capacity.'
    : `${scheduled.length} of ${items.length} initiatives scheduled across ${P} ${periodLabel.toLowerCase()}s, capturing ${totalValue > 0 ? r1((scheduledValue / totalValue) * 100) : 0}% of available value.`;

  return {
    periods: plans, unscheduled,
    criticalPathLength, criticalPath,
    totalValue, scheduledValue,
    valueCapturedPct: totalValue > 0 ? r1((scheduledValue / totalValue) * 100) : 0,
    valueMedianPeriod, headline, guidance, warnings,
  };
}

/** Deterministic summary the model reads — it never recomputes these. */
export function roadmapToPrompt(r) {
  const lines = [`• ${r.headline}`];
  for (const p of r.periods) {
    lines.push(`• Period ${p.period} (${p.utilisationPct}% used): ${p.items.map((i) => i.name).join(', ') || 'nothing scheduled'}`);
  }
  if (r.criticalPathLength) lines.push(`• Critical path: ${r.criticalPath.join(' → ')} (${r.criticalPathLength} periods minimum)`);
  for (const u of r.unscheduled) lines.push(`• NOT SCHEDULED: ${u.name} — ${u.why}`);
  for (const g of r.guidance) lines.push(`• ${g}`);
  return lines.join('\n');
}
