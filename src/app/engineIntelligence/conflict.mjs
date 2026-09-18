/**
 * OBJECTIVE CONFLICT DETECTION — the engine behind Q06.
 *
 * ────────────────────────────────────────────────────────────────
 * WHY SCORING EACH OBJECTIVE INDEPENDENTLY MISSES THE POINT
 *
 * The assessment archetype rates each objective on its own and reports
 * a mean. But an objective set can be perfect object-by-object and
 * still be incoherent, because conflict is a property of PAIRS, not of
 * individuals. "Cut cost 20%" and "raise service quality" are each
 * entirely reasonable; held together, without saying which yields,
 * they guarantee that whoever is asked to deliver both will quietly
 * pick one — and nobody will have decided which.
 *
 * This engine looks for the three ways an objective set contradicts
 * itself:
 *
 *  1. DIRECTIONAL CONFLICT. Two objectives push the same metric in
 *     opposite directions. Unresolvable by effort — one has to yield,
 *     and the only question is whether that is decided deliberately or
 *     discovered late.
 *
 *  2. RESOURCE CONTENTION. Objectives whose combined claim on a shared
 *     resource exceeds what exists. Arithmetic, not judgement: if three
 *     objectives each need 50% of one team, the plan is already 50%
 *     short whatever anyone intends.
 *
 *  3. UNARBITRATED TIES. A conflict where both sides carry equal
 *     priority is the most dangerous case, because there is no rule
 *     for resolving it and it will be resolved informally — by
 *     whoever pushes hardest, at the moment of collision.
 *
 * Priority is what makes a conflict tractable: a conflict between a
 * critical objective and a minor one is a decision already made. So
 * conflicts are reported with a RESOLUTION where priority settles it,
 * and escalated where it does not.
 * ────────────────────────────────────────────────────────────────
 */

/** @typedef {'increases'|'decreases'} Impact */

/**
 * @typedef {Object} ObjectiveEffect
 * @property {string} metric The shared thing this objective moves — cost, headcount, cycle time.
 * @property {Impact} direction
 * @property {number} magnitude 1–5. How strongly this objective moves that metric.
 */

/**
 * @typedef {Object} ResourceClaim
 * @property {string} resource
 * @property {number} sharePct Share of that resource this objective needs, as a percentage.
 */

/**
 * @typedef {Object} Objective
 * @property {string} id
 * @property {string} name
 * @property {number} priority 1–5. What yields when two objectives collide.
 * @property {ObjectiveEffect[]} [effects]
 * @property {ResourceClaim[]} [claims]
 */

/**
 * @typedef {Object} Conflict
 * @property {string} metric
 * @property {string} aId
 * @property {string} aName
 * @property {Impact} aDirection
 * @property {number} aPriority
 * @property {string} bId
 * @property {string} bName
 * @property {Impact} bDirection
 * @property {number} bPriority
 * @property {number} severity Combined magnitude — how hard the two pull against each other.
 * @property {number} priorityGap Priority gap. Zero means nothing decides it.
 * @property {string|null} yields Which objective wins on priority, or null when tied.
 * @property {string} resolution
 * @property {boolean} unarbitrated Equal priority — will be settled informally unless someone rules.
 */

/**
 * @typedef {Object} ResourceOverload
 * @property {string} resource
 * @property {number} claimedPct
 * @property {number} overBy
 * @property {{name:string, sharePct:number, priority:number}[]} claimants
 * @property {string} suggestion What to cut, lowest priority first, to bring it within capacity.
 */

/**
 * @typedef {Object} ConflictResult
 * @property {Conflict[]} conflicts
 * @property {ResourceOverload[]} overloads
 * @property {string[]} independent Objectives touching no shared metric or resource — independent.
 * @property {string[]} entangled Objectives involved in at least one conflict.
 * @property {number} conflictCount
 * @property {number} unarbitratedCount
 * @property {number} coherencePct 0–100. How internally consistent the set is.
 * @property {string} headline
 * @property {string[]} guidance
 * @property {string[]} warnings
 */

const r1 = (n) => Math.round(n * 10) / 10;
const num = (v, d = 0) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : d;
};
const norm = (s) => s.trim().toLowerCase();

/** @param {Objective[]} objectivesIn */
export function computeConflicts(objectivesIn) {
  const warnings = [];
  const guidance = [];

  const objectives = (objectivesIn ?? []).filter((o) => o?.name?.trim() && o?.id);

  if (objectives.length === 0) {
    return {
      conflicts: [], overloads: [], independent: [], entangled: [],
      conflictCount: 0, unarbitratedCount: 0, coherencePct: 0,
      headline: 'No objectives to check.',
      guidance: [],
      warnings: ['Add the objectives, the metrics each one moves, and what it claims.'],
    };
  }
  if (objectives.length === 1) {
    warnings.push('A single objective cannot conflict with anything. Add the others it has to hold alongside.');
  }

  /* ── 1. Directional conflict ──
     Same metric, opposite directions. Checked pairwise because that is
     what conflict is; no per-objective score can surface it. */
  const conflicts = [];
  for (let i = 0; i < objectives.length; i++) {
    for (let j = i + 1; j < objectives.length; j++) {
      const a = objectives[i];
      const b = objectives[j];
      for (const ea of a.effects ?? []) {
        for (const eb of b.effects ?? []) {
          if (!ea.metric?.trim() || norm(ea.metric) !== norm(eb.metric)) continue;
          if (ea.direction === eb.direction) continue;

          const pa = num(a.priority, 3);
          const pb = num(b.priority, 3);
          const gap = Math.abs(pa - pb);
          const yields = gap === 0 ? null : (pa > pb ? b.name : a.name);
          const winner = gap === 0 ? null : (pa > pb ? a.name : b.name);

          conflicts.push({
            metric: ea.metric.trim(),
            aId: a.id, aName: a.name.trim(), aDirection: ea.direction, aPriority: pa,
            bId: b.id, bName: b.name.trim(), bDirection: eb.direction, bPriority: pb,
            severity: r1(num(ea.magnitude, 3) + num(eb.magnitude, 3)),
            priorityGap: gap,
            yields,
            unarbitrated: gap === 0,
            resolution: gap === 0
              ? `Both carry priority ${pa}, so nothing decides this. It will be settled informally by whoever pushes hardest at the moment of collision — rank one above the other now, deliberately.`
              : `${winner} outranks ${yields} by ${gap}. State explicitly that ${yields} yields on ${ea.metric.trim()}, so the person holding both knows which to protect.`,
          });
        }
      }
    }
  }

  /* ── 2. Resource contention ── */
  const byResource = new Map();
  for (const o of objectives) {
    for (const c of o.claims ?? []) {
      if (!c.resource?.trim()) continue;
      const key = norm(c.resource);
      const list = byResource.get(key) ?? [];
      list.push({ name: o.name.trim(), sharePct: Math.max(0, num(c.sharePct)), priority: num(o.priority, 3) });
      byResource.set(key, list);
    }
  }

  const overloads = [];
  for (const [key, claimants] of byResource) {
    const claimed = claimants.reduce((s, c) => s + c.sharePct, 0);
    if (claimed <= 100) continue;

    /* What to drop, lowest priority first, until it fits. */
    const sorted = [...claimants].sort((a, b) => a.priority - b.priority);
    const toCut = [];
    let running = claimed;
    for (const c of sorted) {
      if (running <= 100) break;
      toCut.push(c.name);
      running -= c.sharePct;
    }

    const display = objectives
      .flatMap((o) => o.claims ?? [])
      .find((c) => norm(c.resource) === key)?.resource.trim() ?? key;

    overloads.push({
      resource: display,
      claimedPct: r1(claimed),
      overBy: r1(claimed - 100),
      claimants: claimants.sort((a, b) => b.sharePct - a.sharePct),
      suggestion: toCut.length
        ? `Defer or resource ${toCut.join(', ')} separately — lowest priority first — to bring ${display} within capacity.`
        : `Reduce the claims on ${display}; no single deferral is enough.`,
    });
  }

  /* ── 3. Coherence ──
     The share of possible pairings that are NOT in conflict, penalised
     harder for unarbitrated ones because those are the failures that
     get discovered rather than decided. */
  const pairs = (objectives.length * (objectives.length - 1)) / 2;
  const unarbitratedCount = conflicts.filter((c) => c.unarbitrated).length;
  const penalty = conflicts.length + unarbitratedCount;  // ties count twice
  const coherencePct = pairs > 0
    ? r1(Math.max(0, (1 - penalty / (pairs * 2)) * 100))
    : 100;

  const entangledIds = new Set(conflicts.flatMap((c) => [c.aId, c.bId]));
  const entangled = objectives.filter((o) => entangledIds.has(o.id)).map((o) => o.name.trim());
  const independent = objectives.filter((o) => !entangledIds.has(o.id)).map((o) => o.name.trim());

  /* ── Guidance ── */
  if (unarbitratedCount > 0) {
    guidance.push(`${unarbitratedCount} conflict${unarbitratedCount > 1 ? 's have' : ' has'} no priority difference to settle ${unarbitratedCount > 1 ? 'them' : 'it'}. These are the dangerous ones — not because they are the largest, but because there is no rule for resolving them, so they get resolved by whoever is most insistent.`);
  }
  const worst = [...conflicts].sort((a, b) => b.severity - a.severity)[0];
  if (worst) {
    guidance.push(`The sharpest is "${worst.aName}" against "${worst.bName}" on ${worst.metric} — one wants it up, the other down. No amount of effort satisfies both.`);
  }
  if (overloads.length > 0) {
    const o = overloads[0];
    guidance.push(`${o.resource} is over-committed by ${o.overBy} points across ${o.claimants.length} objectives. That is arithmetic, not ambition — something gives whatever anyone intends.`);
  }
  if (conflicts.length === 0 && overloads.length === 0 && objectives.length > 1) {
    guidance.push('No direct conflicts found. Worth confirming the objectives genuinely share metrics and resources — a set that never collides is sometimes a set that is not specific enough to collide.');
  }
  if (independent.length > 0 && objectives.length > 2) {
    guidance.push(`${independent.join(', ')} touch nothing else in the set. Independent objectives are safe to pursue in parallel, and are the ones to delegate first.`);
  }

  const noEffects = objectives.filter((o) => (o.effects ?? []).length === 0 && (o.claims ?? []).length === 0);
  if (noEffects.length > 0) {
    warnings.push(`${noEffects.map((o) => o.name.trim()).join(', ')} declare no metrics or resource claims, so nothing about ${noEffects.length > 1 ? 'them' : 'it'} could be checked.`);
  }
  const allSamePriority = objectives.length > 2
    && objectives.every((o) => num(o.priority, 3) === num(objectives[0].priority, 3));
  if (allSamePriority) {
    warnings.push('Every objective carries the same priority, so no conflict between them can be resolved on rank. Priority that does not discriminate is not priority.');
  }

  const headline = conflicts.length === 0 && overloads.length === 0
    ? `No contradictions found across ${objectives.length} objectives.`
    : `${conflicts.length} conflict${conflicts.length === 1 ? '' : 's'}${overloads.length ? ` and ${overloads.length} over-committed resource${overloads.length === 1 ? '' : 's'}` : ''} — ${unarbitratedCount > 0 ? `${unarbitratedCount} with nothing to settle ${unarbitratedCount === 1 ? 'it' : 'them'}` : 'all resolvable on priority'}.`;

  return {
    conflicts: conflicts.sort((a, b) => Number(b.unarbitrated) - Number(a.unarbitrated) || b.severity - a.severity),
    overloads, independent, entangled,
    conflictCount: conflicts.length, unarbitratedCount, coherencePct,
    headline, guidance, warnings,
  };
}

/** Deterministic summary the model reads — it never recomputes these. */
export function conflictsToPrompt(r) {
  const lines = [`• ${r.headline}`, `• Coherence: ${r.coherencePct}%`];
  for (const c of r.conflicts) {
    lines.push(`• CONFLICT on ${c.metric}: "${c.aName}" ${c.aDirection} vs "${c.bName}" ${c.bDirection}${c.unarbitrated ? ' [UNARBITRATED]' : ` — ${c.yields} yields`}`);
  }
  for (const o of r.overloads) {
    lines.push(`• OVERLOAD ${o.resource}: ${o.claimedPct}% claimed, over by ${o.overBy}. ${o.suggestion}`);
  }
  for (const g of r.guidance) lines.push(`• ${g}`);
  return lines.join('\n');
}
