/**
 * SCENARIO DECISION ANALYSIS — the engine behind the simulator,
 * foresight and scenario-planner modules (Q03, Q46, Q47, Q68).
 *
 * ────────────────────────────────────────────────────────────────
 * WHY EXPECTED VALUE ALONE IS NOT DECISION ANALYSIS
 *
 * Every one of these modules promises to show what happens across
 * possible futures. The shared assessment archetype cannot express a
 * future at all — it scores the present. But the naive fix, "compute
 * expected value and pick the highest", is barely better, because EV
 * answers only one of the three questions a real choice raises:
 *
 *   1. What is the best BET?              → expected value
 *   2. What will I most REGRET?           → minimax regret (Savage)
 *   3. What if the worst happens?         → maximin (Wald)
 *
 * These three rules frequently disagree, and THAT DISAGREEMENT IS THE
 * FINDING. When one option wins under all three, the decision is easy
 * and needs no meeting. When they diverge, the choice is genuinely
 * about risk appetite rather than about analysis — and saying so is
 * far more useful than presenting one number and implying consensus.
 *
 * The engine therefore reports all three, names the conflict, and
 * refuses to collapse it into a single recommendation.
 *
 * AND ONE THING MOST TOOLS OMIT ENTIRELY:
 *
 *   EVPI — Expected Value of Perfect Information. What it would be
 *   worth to KNOW which scenario occurs before choosing. This is the
 *   number that tells you whether to commission more research or stop
 *   analysing and decide. A low EVPI means further study cannot change
 *   the answer, however uncomfortable the uncertainty feels — which is
 *   the single most common way organisations waste months.
 * ────────────────────────────────────────────────────────────────
 */

/**
 * @typedef {Object} Scenario
 * @property {string} id
 * @property {string} name
 * @property {number} probability 0–100. Must sum to ~100 across scenarios.
 * @property {string} [note]
 */

/**
 * @typedef {Object} DecisionOption
 * @property {string} id
 * @property {string} name
 * @property {Record<string, number>} payoffs Payoff under each scenario, keyed by scenario id. Any unit, as
 *   long as it is the SAME unit throughout — money, utility, headcount.
 */

/**
 * @typedef {Object} OptionAnalysis
 * @property {string} id
 * @property {string} name
 * @property {number} expectedValue
 * @property {number} worstCase
 * @property {number} bestCase
 * @property {number} range Spread between best and worst — the exposure.
 * @property {number} maxRegret Largest amount this option could lose against the best alternative
 *   in any single scenario. The regret metric.
 * @property {number} expectedRegret Probability-weighted regret, not just the worst instance.
 * @property {number} winsPct Share of scenarios where this is the best or joint-best choice.
 * @property {string|null} dominatedBy Beaten by another option in EVERY scenario — never rational.
 */

/** @typedef {'expected_value'|'minimax_regret'|'maximin'} DecisionRule */

/**
 * @typedef {Object} ScenarioDecisionResult
 * @property {(Scenario & {normalisedPct:number})[]} scenarios
 * @property {OptionAnalysis[]} options
 * @property {Record<DecisionRule, {id:string,name:string,value:number}|null>} byRule Winner under each rule. Null when nothing is selectable.
 * @property {boolean} rulesAgree True when every rule picks the same option — the easy case.
 * @property {string|null} conflict What the disagreement is actually about, in one sentence.
 * @property {number} evpi Expected value of perfect information: EV(knowing first) − EV(best
 *   single choice). The ceiling on what any research could be worth.
 * @property {number} evpiPct EVPI as a share of the best expected value.
 * @property {{id:string,name:string,by:string}[]} dominated Options beaten in every scenario — struck out, with the reason.
 * @property {string} headline
 * @property {string[]} guidance
 * @property {string[]} warnings
 */

const r2 = (n) => Math.round(n * 100) / 100;
const num = (v) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * @param {Scenario[]} scenariosIn
 * @param {DecisionOption[]} optionsIn
 */
export function computeScenarioDecision(scenariosIn, optionsIn) {
  const warnings = [];
  const guidance = [];

  const scenarios = (scenariosIn ?? []).filter((s) => s?.name?.trim());
  const options = (optionsIn ?? []).filter((o) => o?.name?.trim());

  const empty = (msg) => ({
    scenarios: [],
    options: [],
    byRule: { expected_value: null, minimax_regret: null, maximin: null },
    rulesAgree: false,
    conflict: null,
    evpi: 0,
    evpiPct: 0,
    dominated: [],
    headline: msg,
    guidance: [],
    warnings: [msg],
  });

  if (scenarios.length === 0)
    return empty('Define at least two scenarios — a single future is a forecast, not an analysis.');
  if (options.length === 0)
    return empty(
      'Define at least two options — with one course of action there is nothing to analyse.',
    );
  if (scenarios.length === 1)
    warnings.push(
      'Only one scenario. With no alternative future, expected value collapses to a single payoff and regret is undefined.',
    );
  if (options.length === 1)
    warnings.push(
      'Only one option — this reports its payoffs but cannot recommend, because there is nothing to compare against.',
    );

  /* Probabilities are normalised rather than rejected, so a set that
     sums to 95 or 103 still produces an answer — but the user is told,
     because a set that does not sum to 100 usually means a scenario is
     missing rather than that the numbers are slightly off. */
  const rawTotal = scenarios.reduce((s, x) => s + Math.max(0, num(x.probability)), 0);
  if (rawTotal <= 0)
    return empty('Every scenario has zero probability. At least one future has to be possible.');
  if (Math.abs(rawTotal - 100) > 1) {
    warnings.push(
      `Scenario probabilities sum to ${r2(rawTotal)}%, not 100%. They have been normalised, but a gap this size usually means a scenario is missing.`,
    );
  }

  const norm = scenarios.map((s) => ({
    ...s,
    normalisedPct: r2((Math.max(0, num(s.probability)) / rawTotal) * 100),
  }));

  const payoff = (o, sid) => num(o.payoffs?.[sid]);

  /* Best achievable payoff in each scenario — the baseline regret is
     measured against, and the input to EVPI. */
  const bestPerScenario = new Map();
  for (const s of norm) {
    bestPerScenario.set(s.id, Math.max(...options.map((o) => payoff(o, s.id))));
  }

  const analyses = options.map((o) => {
    const values = norm.map((s) => payoff(o, s.id));
    const expectedValue = r2(
      norm.reduce((sum, s) => sum + payoff(o, s.id) * (s.normalisedPct / 100), 0),
    );

    const regrets = norm.map((s) => (bestPerScenario.get(s.id) ?? 0) - payoff(o, s.id));
    const maxRegret = r2(Math.max(...regrets));
    const expectedRegret = r2(
      norm.reduce((sum, s, i) => sum + regrets[i] * (s.normalisedPct / 100), 0),
    );

    const wins = norm.filter(
      (s) => payoff(o, s.id) >= (bestPerScenario.get(s.id) ?? 0) - 1e-9,
    ).length;

    return {
      id: o.id,
      name: o.name.trim(),
      expectedValue,
      worstCase: r2(Math.min(...values)),
      bestCase: r2(Math.max(...values)),
      range: r2(Math.max(...values) - Math.min(...values)),
      maxRegret,
      expectedRegret,
      winsPct: r2((wins / norm.length) * 100),
      dominatedBy: null,
    };
  });

  /* DOMINANCE — an option beaten in every single scenario is never the
     rational choice under any rule, so it is struck out rather than
     ranked. Presenting a dominated option alongside the others as if it
     were a live choice is how false balance gets into a decision. */
  const dominated = [];
  for (const a of analyses) {
    const oa = options.find((o) => o.id === a.id);
    for (const b of options) {
      if (b.id === a.id) continue;
      const beatenEverywhere = norm.every((s) => payoff(b, s.id) > payoff(oa, s.id));
      if (beatenEverywhere) {
        const bn = analyses.find((x) => x.id === b.id).name;
        a.dominatedBy = bn;
        dominated.push({ id: a.id, name: a.name, by: bn });
        break;
      }
    }
  }

  const live = analyses.filter((a) => !a.dominatedBy);
  const pool = live.length > 0 ? live : analyses;

  const pick = (rule, cmp, val) => {
    const best = [...pool].sort(cmp)[0];
    return best ? { id: best.id, name: best.name, value: r2(val(best)) } : null;
  };

  const byRule = {
    expected_value: pick(
      'expected_value',
      (a, b) => b.expectedValue - a.expectedValue,
      (a) => a.expectedValue,
    ),
    minimax_regret: pick(
      'minimax_regret',
      (a, b) => a.maxRegret - b.maxRegret,
      (a) => a.maxRegret,
    ),
    maximin: pick(
      'maximin',
      (a, b) => b.worstCase - a.worstCase,
      (a) => a.worstCase,
    ),
  };

  const ids = Object.values(byRule)
    .filter(Boolean)
    .map((r) => r.id);
  const rulesAgree = ids.length > 0 && new Set(ids).size === 1;

  /* ── EVPI ──
     EV if you could know the scenario before choosing, minus the EV of
     the best single commitment you can make now. */
  const evWithPerfectInfo = norm.reduce(
    (sum, s) => sum + (bestPerScenario.get(s.id) ?? 0) * (s.normalisedPct / 100),
    0,
  );
  const bestEv = byRule.expected_value?.value ?? 0;
  const evpi = r2(Math.max(0, evWithPerfectInfo - bestEv));
  const evpiPct = bestEv !== 0 ? r2((evpi / Math.abs(bestEv)) * 100) : 0;

  /* ── Guidance ── */
  let conflict = null;
  if (pool.length === 1 && analyses.length > 1) {
    /* Dominance eliminated everything else. This is the clearest result
       the engine can produce, so it must not fall silent just because
       there is no longer a comparison to make. */
    guidance.push(
      `${pool[0].name} is the only option not beaten in every scenario. The rest are dominated — there is no trade-off left to weigh.`,
    );
  } else if (rulesAgree && pool.length > 1) {
    guidance.push(
      `${byRule.expected_value.name} wins on expected value, on worst case and on regret. When all three agree the choice does not need a meeting.`,
    );
  } else if (!rulesAgree) {
    const ev = byRule.expected_value,
      mm = byRule.maximin,
      mr = byRule.minimax_regret;
    conflict =
      `${ev?.name} is the best bet, ${mm?.name} is the safest if things go badly, and ${mr?.name} is the one you are least likely to regret. ` +
      `They disagree, which means this is a question about risk appetite, not about analysis — more data will not resolve it.`;
    guidance.push(conflict);
  }

  if (evpiPct < 5 && bestEv !== 0) {
    guidance.push(
      `Resolving the uncertainty entirely would improve the outcome by only ${evpi} (${evpiPct}%). Further research cannot change the answer — decide now.`,
    );
  } else if (evpiPct > 25) {
    guidance.push(
      `Knowing which scenario occurs would be worth ${evpi} (${evpiPct}% of the best expected value). That is the ceiling on what research or a pilot is worth — spend up to it, not beyond.`,
    );
  }

  const robust = [...pool].sort((a, b) => b.winsPct - a.winsPct)[0];
  if (robust && robust.winsPct >= 60 && robust.id !== byRule.expected_value?.id) {
    guidance.push(
      `${robust.name} is best in ${robust.winsPct}% of scenarios without winning on expected value — a robust choice rather than an optimising one.`,
    );
  }
  const widest = [...pool].sort((a, b) => b.range - a.range)[0];
  if (widest && widest.range > 0 && widest.id === byRule.expected_value?.id) {
    guidance.push(
      `${widest.name} has the widest spread of outcomes of any live option. It is the best bet and the most exposed one; size the commitment accordingly.`,
    );
  }

  if (dominated.length > 0) {
    warnings.push(
      `${dominated.length} option${dominated.length > 1 ? 's are' : ' is'} beaten in every scenario and cannot be rational: ${dominated.map((d) => `${d.name} (by ${d.by})`).join(', ')}.`,
    );
  }
  const equalProbs = new Set(norm.map((s) => s.normalisedPct)).size === 1 && norm.length > 2;
  if (equalProbs) {
    warnings.push(
      'Every scenario carries identical probability. That is rarely a belief — it is usually a placeholder nobody revisited.',
    );
  }

  const headline = byRule.expected_value
    ? rulesAgree
      ? `${byRule.expected_value.name} — best under every decision rule.`
      : `No single answer: ${byRule.expected_value.name} on expected value, ${byRule.maximin?.name} on worst case.`
    : 'Nothing selectable.';

  return {
    scenarios: norm,
    options: analyses.sort((a, b) => b.expectedValue - a.expectedValue),
    byRule,
    rulesAgree,
    conflict,
    evpi,
    evpiPct,
    dominated,
    headline,
    guidance,
    warnings,
  };
}

/** Deterministic summary the model reads — it never recomputes these. */
export function scenarioDecisionToPrompt(r) {
  const lines = [`• ${r.headline}`];
  lines.push(
    `• Expected value: ${r.byRule.expected_value?.name ?? '—'} (${r.byRule.expected_value?.value ?? 0})`,
  );
  lines.push(
    `• Safest worst case: ${r.byRule.maximin?.name ?? '—'} (${r.byRule.maximin?.value ?? 0})`,
  );
  lines.push(
    `• Least regret: ${r.byRule.minimax_regret?.name ?? '—'} (max regret ${r.byRule.minimax_regret?.value ?? 0})`,
  );
  lines.push(
    `• EVPI: ${r.evpi} (${r.evpiPct}% of best EV) — the ceiling on what research is worth`,
  );
  for (const g of r.guidance) lines.push(`• ${g}`);
  for (const d of r.dominated)
    lines.push(`• DOMINATED: ${d.name} is beaten in every scenario by ${d.by}`);
  return lines.join('\n');
}
