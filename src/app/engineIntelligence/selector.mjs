/**
 * WEIGHTED SELECTION — the engine behind the selector modules
 * (Q21, Q35).
 *
 * ────────────────────────────────────────────────────────────────
 * WHY A WEIGHTED SCORE ON ITS OWN IS NOT A RECOMMENDATION
 *
 * Every spreadsheet does weighted scoring: rate each option on each
 * criterion, multiply by weights, sum, pick the highest. Three things
 * make that untrustworthy, and this engine addresses each:
 *
 *  1. SCALE. Criteria arrive in different units — cost in thousands,
 *     quality out of five, delivery in weeks. Summed raw, whichever
 *     criterion has the largest numbers silently dominates regardless
 *     of its weight. Every criterion is therefore normalised to 0–1
 *     across the options before any weight is applied.
 *
 *  2. DIRECTION. Cost and risk are better LOW; quality is better high.
 *     A sum that treats them alike recommends the most expensive
 *     option. Each criterion declares its direction.
 *
 *  3. FALSE PRECISION — the important one. A winner ahead by 0.3
 *     points is not a decision, it is a rounding error wearing a
 *     rosette. So the engine runs SENSITIVITY ANALYSIS: for each
 *     criterion it computes how far that weight would have to move to
 *     change the winner. If a 5% shift flips it, the result is a
 *     coin toss and is reported as one.
 *
 * The output is therefore a recommendation WITH its own fragility
 * attached, not a leaderboard.
 * ────────────────────────────────────────────────────────────────
 */

/** @typedef {'higher_better'|'lower_better'} Direction */

/**
 * @typedef {Object} Criterion
 * @property {string} id
 * @property {string} name
 * @property {number} weight Relative importance. Normalised internally, so any scale works.
 * @property {Direction} direction
 */

/**
 * @typedef {Object} SelectionOption
 * @property {string} id
 * @property {string} name
 * @property {Record<string, number>} scores criterionId → raw value in that criterion's own units.
 * @property {boolean} [disqualified] Fails a hard requirement — excluded from ranking, reported.
 * @property {string} [disqualifiedReason]
 */

/**
 * @typedef {Object} ScoredOption
 * @property {string} id
 * @property {string} name
 * @property {number} totalPct 0–100. Weighted, normalised, direction-aware.
 * @property {number} rank
 * @property {{criterionId:string, name:string, raw:number, normalised:number, contribution:number, isBest:boolean, isWorst:boolean}[]} breakdown
 *   Per criterion: raw, normalised and the points it contributed. isBest/isWorst: Best or worst on this criterion across all options.
 * @property {string|null} dominatedBy Beaten by another option on EVERY criterion — never rational.
 * @property {boolean} disqualified
 * @property {string} [disqualifiedReason]
 */

/**
 * @typedef {Object} WeightSensitivity
 * @property {string} criterionId
 * @property {string} name
 * @property {number} currentWeightPct
 * @property {number|null} flipDistancePct Percentage points the weight must move to change the winner.
 *   Null when no movement in either direction changes it.
 * @property {string|null} flipsTo Which option would take over.
 * @property {'increase'|'decrease'|null} direction
 */

/**
 * @typedef {Object} SelectionResult
 * @property {ScoredOption[]} ranked
 * @property {ScoredOption[]} disqualified
 * @property {ScoredOption|null} winner
 * @property {ScoredOption|null} runnerUp
 * @property {number} marginPct Points between first and second.
 * @property {boolean} tooCloseToCall True when the margin is inside the noise of the inputs.
 * @property {WeightSensitivity[]} sensitivity
 * @property {WeightSensitivity|null} mostFragileCriterion The criterion whose weight most easily changes the answer.
 * @property {string} headline
 * @property {string[]} guidance
 * @property {string[]} warnings
 */

const r1 = (n) => Math.round(n * 10) / 10;
const num = (v, d = 0) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : d;
};

/** Below this margin the winner is not meaningfully ahead. */
const NOISE_MARGIN_PCT = 3;

function normalise(values, direction) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  /* Every option identical on this criterion: it carries no
     information, so it contributes equally rather than dividing by
     zero or arbitrarily favouring someone. */
  if (span === 0) return values.map(() => 1);
  return values.map((v) => (direction === 'higher_better' ? (v - min) / span : (max - v) / span));
}

function scoreAll(options, criteria, weightOverride) {
  const weights = criteria.map((c) => Math.max(0, num(weightOverride?.[c.id] ?? c.weight)));
  const wSum = weights.reduce((a, b) => a + b, 0) || 1;

  const normalisedByCriterion = criteria.map((c) =>
    normalise(
      options.map((o) => num(o.scores?.[c.id])),
      c.direction,
    ),
  );

  return options.map((o, oi) => ({
    id: o.id,
    name: o.name,
    total:
      criteria.reduce(
        (sum, _c, ci) => sum + normalisedByCriterion[ci][oi] * (weights[ci] / wSum),
        0,
      ) * 100,
  }));
}

/**
 * @param {SelectionOption[]} optionsIn
 * @param {Criterion[]} criteriaIn
 */
export function computeSelection(optionsIn, criteriaIn) {
  const warnings = [];
  const guidance = [];

  const criteria = (criteriaIn ?? []).filter((c) => c?.name?.trim() && c?.id);
  const all = (optionsIn ?? []).filter((o) => o?.name?.trim() && o?.id);
  const live = all.filter((o) => !o.disqualified);

  if (criteria.length === 0 || all.length === 0) {
    return {
      ranked: [],
      disqualified: [],
      winner: null,
      runnerUp: null,
      marginPct: 0,
      tooCloseToCall: false,
      sensitivity: [],
      mostFragileCriterion: null,
      headline: 'Nothing to compare yet.',
      guidance: [],
      warnings: ['Add at least two options and one criterion.'],
    };
  }
  if (live.length < 2) {
    warnings.push(
      live.length === 1
        ? 'Only one option is still in the running — this is an approval, not a selection.'
        : 'Every option is disqualified.',
    );
  }

  const scored = scoreAll(live, criteria, undefined);
  const byId = new Map(scored.map((s) => [s.id, s.total]));

  /* Per-criterion normalised values, reused for the breakdown. */
  const normPerCriterion = criteria.map((c) =>
    normalise(
      live.map((o) => num(o.scores?.[c.id])),
      c.direction,
    ),
  );
  const wRaw = criteria.map((c) => Math.max(0, num(c.weight)));
  const wSum = wRaw.reduce((a, b) => a + b, 0) || 1;

  const build = (o, disq) => {
    const oi = live.findIndex((l) => l.id === o.id);
    const breakdown = criteria.map((c, ci) => {
      const col = normPerCriterion[ci];
      const nv = oi >= 0 ? col[oi] : 0;
      return {
        criterionId: c.id,
        name: c.name.trim(),
        raw: num(o.scores?.[c.id]),
        normalised: r1(nv * 100) / 100,
        contribution: r1(nv * (wRaw[ci] / wSum) * 100),
        isBest: oi >= 0 && nv >= Math.max(...col) - 1e-9,
        isWorst: oi >= 0 && nv <= Math.min(...col) + 1e-9,
      };
    });
    return {
      id: o.id,
      name: o.name.trim(),
      totalPct: disq ? 0 : r1(byId.get(o.id) ?? 0),
      rank: 0,
      breakdown,
      dominatedBy: null,
      disqualified: disq,
      ...(o.disqualifiedReason ? { disqualifiedReason: o.disqualifiedReason } : {}),
    };
  };

  const ranked = live.map((o) => build(o, false)).sort((a, b) => b.totalPct - a.totalPct);
  ranked.forEach((o, i) => {
    o.rank = i + 1;
  });
  const disqualified = all.filter((o) => o.disqualified).map((o) => build(o, true));

  /* ── Dominance ──
     Beaten on every single criterion. Keeping a dominated option in a
     shortlist is how a comparison is made to look thorough while
     adding nothing — the same decoy problem the decision-quality
     engine checks for. */
  for (const a of ranked) {
    for (const b of ranked) {
      if (a.id === b.id) continue;
      const bBeatsA =
        criteria.every((_c, ci) => {
          const av = a.breakdown[ci].normalised;
          const bv = b.breakdown[ci].normalised;
          return bv >= av;
        }) && criteria.some((_c, ci) => b.breakdown[ci].normalised > a.breakdown[ci].normalised);
      if (bBeatsA) {
        a.dominatedBy = b.name;
        break;
      }
    }
  }

  const winner = ranked[0] ?? null;
  const runnerUp = ranked[1] ?? null;
  const marginPct = winner && runnerUp ? r1(winner.totalPct - runnerUp.totalPct) : 0;
  const tooCloseToCall = Boolean(winner && runnerUp && marginPct < NOISE_MARGIN_PCT);

  /* ── Sensitivity ──
     For each criterion, move its weight up and down and find the
     smallest shift that changes the winner. This is what turns a
     score into a decision someone can defend: "cost would have to
     matter 30 points more before this answer changes" is an argument;
     "option B scored 71.4" is not. */
  const sensitivity = criteria.map((c, ci) => {
    const currentPct = r1((wRaw[ci] / wSum) * 100);
    let flipDistancePct = null;
    let flipsTo = null;
    let direction = null;

    if (winner && live.length >= 2) {
      for (const step of [1, 2, 3, 5, 8, 12, 18, 25, 35, 50, 70, 100]) {
        for (const dir of ['increase', 'decrease']) {
          const delta = (dir === 'increase' ? 1 : -1) * (step / 100) * wSum;
          const next = Math.max(0, wRaw[ci] + delta);
          const override = Object.fromEntries(
            criteria.map((x, xi) => [x.id, xi === ci ? next : wRaw[xi]]),
          );
          const re = scoreAll(live, criteria, override).sort((a, b) => b.total - a.total);
          if (re[0] && re[0].id !== winner.id) {
            flipDistancePct = step;
            flipsTo = re[0].name;
            direction = dir;
            break;
          }
        }
        if (flipDistancePct !== null) break;
      }
    }
    return {
      criterionId: c.id,
      name: c.name.trim(),
      currentWeightPct: currentPct,
      flipDistancePct,
      flipsTo,
      direction,
    };
  });

  const flippable = sensitivity.filter((s) => s.flipDistancePct !== null);
  const mostFragileCriterion = flippable.length
    ? flippable.reduce((a, b) => (a.flipDistancePct <= b.flipDistancePct ? a : b))
    : null;

  /* ── Guidance ── */
  if (tooCloseToCall && winner && runnerUp) {
    guidance.push(
      `${winner.name} and ${runnerUp.name} are ${marginPct} points apart. That is inside the noise of the inputs — treat this as a tie and choose on something the scoring does not capture.`,
    );
  }
  const fragileDistance = mostFragileCriterion?.flipDistancePct ?? null;
  if (mostFragileCriterion && fragileDistance !== null) {
    const f = mostFragileCriterion;
    const dir = f.direction === 'increase' ? 'up' : 'down';
    guidance.push(
      fragileDistance <= 5
        ? `The result is fragile: moving "${f.name}" by ${fragileDistance} points ${dir} hands it to ${f.flipsTo}. Agree that weight before relying on the answer.`
        : `"${f.name}" is the weight that matters most — it would have to shift ${fragileDistance} points ${dir} before ${f.flipsTo} takes over.`,
    );
  }
  if (flippable.length === 0 && winner && live.length >= 2) {
    guidance.push(
      `No single weight change flips this result — ${winner.name} wins under every weighting tested. That is a robust answer.`,
    );
  }
  const dominated = ranked.filter((o) => o.dominatedBy);
  if (dominated.length > 0) {
    guidance.push(
      `${dominated.map((d) => d.name).join(', ')} ${dominated.length > 1 ? 'are' : 'is'} beaten on every criterion. Keeping ${dominated.length > 1 ? 'them' : 'it'} in the comparison adds the appearance of choice, not choice.`,
    );
  }
  if (winner) {
    const weakest = winner.breakdown.filter((b) => b.isWorst);
    if (weakest.length > 0) {
      guidance.push(
        `${winner.name} wins overall but is the worst option on ${weakest.map((w) => w.name).join(', ')}. Make sure that is acceptable rather than merely outweighed.`,
      );
    }
  }

  const zeroWeights = criteria.filter((c) => num(c.weight) <= 0);
  if (zeroWeights.length > 0) {
    warnings.push(
      `${zeroWeights.map((c) => c.name).join(', ')} carry zero weight and had no effect. Remove them or give them a weight.`,
    );
  }
  if (
    criteria.length > 0 &&
    criteria.every((c) => num(c.weight) === num(criteria[0].weight)) &&
    criteria.length > 2
  ) {
    warnings.push(
      'Every criterion carries the same weight. If they genuinely matter equally that is fine, but it is more often a weighting nobody has done yet.',
    );
  }
  const flat = criteria.filter(
    (_c, ci) => new Set(normPerCriterion[ci].map((v) => r1(v * 100))).size === 1,
  );
  if (flat.length > 0) {
    warnings.push(
      `${flat.map((c) => c.name).join(', ')} score identically across every option, so ${flat.length > 1 ? 'they cannot' : 'it cannot'} discriminate between them.`,
    );
  }

  const headline = !winner
    ? 'No option could be ranked.'
    : tooCloseToCall && runnerUp
      ? `${winner.name} edges it by ${marginPct} points — too close to call against ${runnerUp.name}.`
      : `${winner.name} wins by ${marginPct} points${mostFragileCriterion && fragileDistance !== null ? `, and holds unless "${mostFragileCriterion.name}" moves ${fragileDistance} points` : ' under every weighting tested'}.`;

  return {
    ranked,
    disqualified,
    winner,
    runnerUp,
    marginPct,
    tooCloseToCall,
    sensitivity,
    mostFragileCriterion,
    headline,
    guidance,
    warnings,
  };
}

/** Deterministic summary the model reads — it never recomputes these. */
export function selectionToPrompt(r) {
  const lines = [`• ${r.headline}`];
  for (const o of r.ranked) {
    lines.push(
      `• ${o.rank}. ${o.name}: ${o.totalPct}%${o.dominatedBy ? ` (DOMINATED by ${o.dominatedBy})` : ''}`,
    );
  }
  for (const d of r.disqualified)
    lines.push(
      `• DISQUALIFIED: ${d.name}${d.disqualifiedReason ? ` — ${d.disqualifiedReason}` : ''}`,
    );
  for (const s of r.sensitivity) {
    lines.push(
      `• Weight "${s.name}" at ${s.currentWeightPct}%: ${s.flipDistancePct === null ? 'no shift changes the winner' : `${s.flipDistancePct}pt ${s.direction} hands it to ${s.flipsTo}`}`,
    );
  }
  for (const g of r.guidance) lines.push(`• ${g}`);
  return lines.join('\n');
}
