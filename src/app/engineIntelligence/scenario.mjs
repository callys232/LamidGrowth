/**
 * Archetype F — decision scenario input and derivation.
 *
 * Serves the Q-Series modules that model choices: timing, outcome ranges, and
 * decision design. Expected value and risk weighting are arithmetic, computed
 * here so two identical inputs always produce the same ranking.
 */

/**
 * @typedef {Object} ScenarioOption
 * @property {string} id
 * @property {string} name
 * @property {number} probability 0–100 subjective likelihood of the upside landing.
 * @property {number} upside Value if it succeeds, in the user's own unit.
 * @property {number} downside Loss if it fails. Entered positive, treated as negative.
 * @property {number} cost
 * @property {number} horizon Months until the outcome is known.
 */

/**
 * @typedef {ScenarioOption & Object} ScenarioDerived
 * @property {number} expectedValue
 * @property {number} netExpected expected value less cost
 * @property {number} range Spread between best and worst case — the risk exposure.
 * @property {number} valuePerMonth Net expected value per month of exposure.
 * @property {number} rank
 */

/**
 * How far a probability estimate can move before the ranking changes.
 *
 * Every probability entered here is a judgement call. Rather than treating the
 * ranking as settled, this reports the breakeven: the probability at which the
 * runner-up would overtake the leader. A wide margin means the decision is
 * robust to a bad estimate; a narrow one means it hinges on a guess.
 *
 * @typedef {Object} ScenarioSensitivity
 * @property {string} challenger The option being tested against the leader.
 * @property {string} leader
 * @property {number|null} breakevenPct Probability the challenger needs to draw level, or null if unreachable.
 * @property {number} currentPct Its current probability — distance from breakeven is the margin.
 * @property {number|null} marginPoints Percentage points of headroom. Negative means it already wins.
 * @property {boolean} flipsEasily True when a plausible estimating error would flip the decision.
 */

/**
 * @typedef {Object} ScenarioSummary
 * @property {ScenarioDerived[]} options
 * @property {ScenarioDerived|null} best
 * @property {ScenarioDerived|null} safest
 * @property {boolean} hasTradeoff True when the highest-value option is not the lowest-risk one.
 * @property {number} totalCost
 * @property {ScenarioSensitivity[]} sensitivity Breakeven analysis for each non-leading option.
 * @property {number|null} tightestMargin Smallest margin across all challengers — how fragile the ranking is.
 * @property {string[]} warnings
 */

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const num = (v) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};
const clampPct = (v) => Math.max(0, Math.min(100, num(v)));

/** @param {ScenarioOption[]} options */
export function computeScenarios(options) {
  const warnings = [];
  const clean = options.filter((o) => o.name.trim());

  if (clean.length === 0) {
    return {
      options: [],
      best: null,
      safest: null,
      hasTradeoff: false,
      totalCost: 0,
      sensitivity: [],
      tightestMargin: null,
      warnings: ['Add at least two options to compare.'],
    };
  }

  const derived = clean.map((o) => {
    const p = clampPct(o.probability) / 100;
    const upside = num(o.upside);
    const downside = Math.abs(num(o.downside));
    const cost = Math.abs(num(o.cost));
    const horizon = Math.max(1, num(o.horizon));

    // Standard EV: p × upside − (1−p) × downside
    const expectedValue = r2(p * upside - (1 - p) * downside);
    const netExpected = r2(expectedValue - cost);

    return {
      ...o,
      probability: clampPct(o.probability),
      expectedValue,
      netExpected,
      range: r2(upside + downside),
      valuePerMonth: r2(netExpected / horizon),
      rank: 0,
    };
  });

  // Rank by net expected value.
  const byValue = [...derived].sort((a, b) => b.netExpected - a.netExpected);
  byValue.forEach((o, i) => {
    o.rank = i + 1;
  });

  const best = byValue[0] ?? null;
  // Safest = smallest downside spread, not smallest cost.
  const safest = [...derived].sort((a, b) => a.range - b.range)[0] ?? null;

  const hasTradeoff = Boolean(best && safest && best.id !== safest.id);
  const totalCost = r2(derived.reduce((a, o) => a + Math.abs(num(o.cost)), 0));

  /* ── Checks worth surfacing ── */
  if (clean.length === 1) {
    warnings.push('Only one option entered — there is nothing to compare it against.');
  }
  if (best && best.netExpected < 0) {
    warnings.push(
      'Every option has negative expected value after cost. Doing nothing may dominate.',
    );
  }
  if (hasTradeoff) {
    warnings.push(
      `Highest-value option (${best.name}) is not the lowest-risk one (${safest.name}).`,
    );
  }
  const vague = derived.filter((o) => o.probability > 45 && o.probability < 55).length;
  if (vague > 0 && derived.length > 1) {
    warnings.push(
      `${vague} option${vague > 1 ? 's sit' : ' sits'} near 50% probability — that usually means the estimate is a guess.`,
    );
  }

  /* ── Sensitivity: what would have to be wrong for the ranking to change ── */
  const sensitivity = best ? byValue.slice(1).map((c) => breakeven(c, best)) : [];
  const margins = sensitivity.map((s) => s.marginPoints).filter((m) => m !== null);
  const tightestMargin = margins.length ? Math.min(...margins) : null;

  if (tightestMargin !== null && tightestMargin <= 10) {
    const tight = sensitivity.find((s) => s.marginPoints === tightestMargin);
    warnings.push(
      `The ranking is fragile: ${tight.challenger} overtakes ${tight.leader} once its probability passes ${tight.breakevenPct}% — only ${tightestMargin} points above the ${tight.currentPct}% entered.`,
    );
  }

  return {
    options: byValue,
    best,
    safest,
    hasTradeoff,
    totalCost,
    sensitivity,
    tightestMargin,
    warnings,
  };
}

/**
 * Probability at which `challenger` draws level with `leader`.
 *
 * netExpected(p) = p·upside − (1−p)·downside − cost
 *                = p·(upside + downside) − downside − cost
 *
 * Setting that equal to the leader's net expected value and solving for p:
 *   p = (leaderNet + downside + cost) / (upside + downside)
 *
 * Returns null when the spread is zero (no probability changes the outcome) or
 * when the breakeven falls outside 0–100 and is therefore unreachable.
 */
function breakeven(challenger, leader) {
  const upside = num(challenger.upside);
  const downside = Math.abs(num(challenger.downside));
  const cost = Math.abs(num(challenger.cost));
  const spread = upside + downside;

  const base = {
    challenger: challenger.name,
    leader: leader.name,
    breakevenPct: null,
    currentPct: challenger.probability,
    marginPoints: null,
    flipsEasily: false,
  };

  if (spread === 0) return base;

  const p = ((leader.netExpected + downside + cost) / spread) * 100;
  if (!Number.isFinite(p) || p < 0 || p > 100) return base;

  const breakevenPct = r2(p);
  const marginPoints = r2(breakevenPct - challenger.probability);

  return {
    ...base,
    breakevenPct,
    marginPoints,
    flipsEasily: marginPoints <= 10,
  };
}

export function scenariosToPrompt(s) {
  const lines = s.options.map(
    (o) =>
      `• ${o.name}: ${o.probability}% likely, EV ${o.expectedValue.toLocaleString()}, net of cost ${o.netExpected.toLocaleString()}, ${o.horizon}mo horizon, risk spread ${o.range.toLocaleString()} (rank ${o.rank})`,
  );
  if (s.best) lines.push(`• Highest net expected value: ${s.best.name}`);
  if (s.safest) lines.push(`• Narrowest risk spread: ${s.safest.name}`);
  if (s.hasTradeoff) lines.push(`• A value-versus-risk tradeoff exists between these two.`);

  for (const sv of s.sensitivity) {
    if (sv.breakevenPct === null) continue;
    lines.push(
      `• ${sv.challenger} overtakes ${sv.leader} at ${sv.breakevenPct}% probability (currently ${sv.currentPct}%, margin ${sv.marginPoints} points)${sv.flipsEasily ? ' — fragile' : ''}`,
    );
  }
  return lines.join('\n');
}
