/**
 * Dimension scores derived from the compute layer.
 *
 * Every module renders four scored dimensions. Until now those came back from
 * the language model, which meant the headline numbers on a result page were
 * generated text sitting above real arithmetic — a "Valuation Driver Index"
 * with no valuation model behind it.
 *
 * These functions replace that. Each one turns an already-computed summary into
 * four dimensions whose values are arithmetic and whose insights quote the
 * figures they came from. The registry's own `dimensionLabels` still travel to
 * the model to frame the narrative sections, so per-module specificity survives
 * in the prose — but the scores are now the same numbers the tables show.
 *
 * Every module now has a compute layer. The 144 that had none are assessed
 * against their own dimensions — rated, weighted, and discounted where the
 * rating has no evidence behind it — so no score on any result page originates
 * from the model.
 */

/**
 * @typedef {Object} ComputedDimension
 * @property {string} label
 * @property {number} value 0–100
 * @property {string} insight
 */

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
const money = (n) => Math.round(n).toLocaleString();

/* ── Archetype C — financial ──────────────────────────────────────────── */

/**
 * @param {import('./financial.mjs').FinancialSummary} s
 * @returns {ComputedDimension[]}
 */
export function financialDimensions(s) {
  const c = s.currency;

  // Growth is unbounded in both directions; centre it so flat reads as 50.
  const growthScore = clamp(50 + s.revenueGrowthPct);

  const costLine = s.opexLines.length
    ? `Largest line is ${s.opexLines[0].category} at ${s.opexLines[0].pctOfOpex}% of opex.`
    : `Operating cost is ${s.opexRatioPct}% of revenue.`;

  return [
    {
      label: 'Gross Margin',
      value: clamp(s.grossMarginPct),
      insight: `${c} ${money(s.grossProfit)} gross profit on ${c} ${money(s.totalRevenue)} revenue — ${s.grossMarginPct}%.`,
    },
    {
      label: 'Operating Margin',
      // Losses floor at 0 rather than going negative; the insight carries the sign.
      value: clamp(s.operatingMarginPct),
      insight:
        s.operatingProfit >= 0
          ? `Operating profit of ${c} ${money(s.operatingProfit)} — ${s.operatingMarginPct}% of revenue.`
          : `Operating loss of ${c} ${money(Math.abs(s.operatingProfit))} across the period.`,
    },
    {
      label: 'Revenue Growth',
      value: growthScore,
      insight: `${s.revenueGrowthPct >= 0 ? 'Up' : 'Down'} ${Math.abs(s.revenueGrowthPct)}% from the first ${s.periodLabel.toLowerCase()} to the last.`,
    },
    {
      label: 'Cost Efficiency',
      value: clamp(100 - s.opexRatioPct),
      insight: costLine,
    },
  ];
}

/* ── Archetype B — time series ────────────────────────────────────────── */

/**
 * @param {import('./inputSpec.mjs').SeriesStats[]} stats
 * @returns {ComputedDimension[]}
 */
export function seriesDimensions(stats) {
  const perMetric = stats.map((s) => {
    // With a target, score attainment. Without one, fall back to stability —
    // the only honest score available when there is nothing to measure against.
    const value = s.attainment !== null ? clamp(s.attainment) : clamp(100 - s.volatility);

    const insight =
      s.target !== null
        ? `${s.last}${s.unit} against a ${s.target}${s.unit} target — ${s.onTarget ? 'met' : 'missed'}, ${s.trend}.`
        : `${s.first}${s.unit} → ${s.last}${s.unit}, ${s.trend} (${s.volatility}% mean swing).`;

    return { label: s.label, value, insight };
  });

  // Fourth dimension: how trustworthy the series is as a basis for decisions.
  const meanVolatility = stats.length
    ? stats.reduce((a, s) => a + s.volatility, 0) / stats.length
    : 0;
  const volatileCount = stats.filter((s) => s.trend === 'volatile').length;

  perMetric.push({
    label: 'Signal Stability',
    value: clamp(100 - meanVolatility),
    insight: volatileCount
      ? `${volatileCount} of ${stats.length} metrics swing too much to read as a trend.`
      : `Mean period-over-period swing of ${Math.round(meanVolatility)}% — steady enough to act on.`,
  });

  return perMetric;
}

/* ── Archetype E — roster ─────────────────────────────────────────────── */

/**
 * @param {import('./roster.mjs').RosterSummary} s
 * @returns {ComputedDimension[]}
 */
export function rosterDimensions(s) {
  // Divergence between the flat and headcount-weighted averages shows whether
  // capability is evenly spread or concentrated in a few small teams.
  const divergence = Math.abs(s.meanCapability - s.weightedCapability);

  return [
    {
      label: 'Weighted Capability',
      value: clamp((s.weightedCapability / 5) * 100),
      insight: `${s.weightedCapability}/5 across ${s.totalHeadcount} people in ${s.roleCount} roles, weighted by headcount.`,
    },
    {
      label: 'Capability Consistency',
      value: clamp(100 - (divergence / 5) * 100),
      insight:
        divergence >= 0.5
          ? `Role average is ${s.meanCapability}/5 but headcount-weighted is ${s.weightedCapability}/5 — capability is unevenly spread.`
          : `Capability is consistent across roles regardless of team size.`,
    },
    {
      label: 'Bench Coverage',
      value: clamp(s.benchCoveragePct),
      insight: s.singlePointRoles.length
        ? `${s.singlePointRoles.length} of ${s.criticalRoleCount} critical roles have no ready successor.`
        : s.criticalRoleCount > 0
          ? `All ${s.criticalRoleCount} critical roles have at least one successor identified.`
          : `No roles marked critical — succession cannot be assessed.`,
    },
    {
      label: 'Retention Stability',
      value: clamp(100 - s.atRiskPct),
      insight: `${s.atRiskPct}% of headcount sits in high-attrition-risk roles.`,
    },
  ];
}

/* ── Archetype F — scenario ───────────────────────────────────────────── */

/**
 * @param {import('./scenario.mjs').ScenarioSummary} s
 * @returns {ComputedDimension[]}
 */
export function scenarioDimensions(s) {
  const best = s.best;

  // Return on what the option costs, capped so one outlier cannot peg the scale.
  const returnRatio = best && best.cost > 0 ? best.netExpected / Math.abs(best.cost) : 0;
  const returnScore = best ? clamp(50 + returnRatio * 25) : 0;

  // A wide spread relative to the expected value is exposure, not upside.
  const spreadRatio = best && best.range > 0 ? Math.abs(best.netExpected) / best.range : 0;

  // Probabilities clustered at 50 are guesses; distance from 50 is conviction.
  const conviction = s.options.length
    ? s.options.reduce((a, o) => a + Math.abs(o.probability - 50), 0) / s.options.length
    : 0;

  return [
    {
      label: 'Expected Return',
      value: returnScore,
      insight: best
        ? `${best.name} leads at ${money(best.netExpected)} net of a ${money(best.cost)} cost.`
        : `No options entered.`,
    },
    {
      label: 'Risk Spread',
      value: clamp(spreadRatio * 100),
      insight: best
        ? `${best.name} carries a ${money(best.range)} spread between best and worst case.`
        : `No options entered.`,
    },
    {
      label: 'Ranking Robustness',
      // A wide breakeven margin means a bad probability estimate will not flip it.
      value: s.tightestMargin === null ? 50 : clamp(s.tightestMargin * 3),
      insight:
        s.tightestMargin === null
          ? `Only one option — nothing to test the ranking against.`
          : `The ranking flips if the runner-up's probability moves ${s.tightestMargin} points.`,
    },
    {
      label: 'Estimate Confidence',
      value: clamp(conviction * 2),
      insight:
        conviction < 15
          ? `Probabilities average ${Math.round(conviction)} points from 50% — mostly guesswork.`
          : `Probabilities are ${Math.round(conviction)} points from 50% on average — considered estimates.`,
    },
  ];
}

/* ── Archetype D — budget ─────────────────────────────────────────────── */

/**
 * @param {import('@/lib/budget/types').ComputedBudget} b
 * @returns {ComputedDimension[]}
 */
export function budgetDimensions(b) {
  const { totals, categories, lineItems, variance, settings } = b;

  const phased = lineItems.filter((li) => li.period && li.period >= 1).length;
  const phasingPct = lineItems.length ? (phased / lineItems.length) * 100 : 0;
  const topShare = categories.length ? categories[0].pctOfDirect : 0;

  // 10% contingency reads as full marks; 0% as none.
  const contingencyScore = clamp((settings.contingencyPct / 10) * 100);

  return [
    {
      label: 'Contingency Cover',
      value: contingencyScore,
      insight:
        settings.contingencyPct > 0
          ? `${settings.contingencyPct}% contingency — ${money(totals.contingency)} held against overruns.`
          : `No contingency held. Most projects carry 5–15%.`,
    },
    {
      label: 'Cost Spread',
      value: clamp(100 - topShare),
      insight: categories.length
        ? `${categories[0].category} is ${topShare}% of direct cost across ${categories.length} categories.`
        : `No cost categories populated yet.`,
    },
    {
      label: 'Phasing Coverage',
      value: clamp(phasingPct),
      insight: `${phased} of ${lineItems.length} lines assigned to a ${settings.periodLabel.toLowerCase()} — the rest spread evenly.`,
    },
    variance.tracked
      ? {
          label: 'Budget Adherence',
          // On plan reads as 100; every point of overrun costs two.
          value: clamp(100 - Math.max(0, variance.variancePct) * 2),
          insight: `${variance.linesTracked} lines tracked — ${money(variance.actualOnTracked)} spent against ${money(variance.budgetedOnTracked)} planned (${variance.variancePct >= 0 ? '+' : ''}${variance.variancePct}%).`,
        }
      : {
          label: 'Budget Adherence',
          value: 0,
          insight: `No actuals entered yet — add spend against lines to track variance.`,
        },
  ];
}

/* ── Archetype G — assessment ─────────────────────────────────────────── */

/**
 * The module's own dimensions, scored from the ratings rather than by a model.
 *
 * Evidence-adjusted values are used, not raw ones: a dimension asserted at 5
 * with nothing behind it should not read the same as one that is documented.
 * The insight names the evidence level so the discount is never silent.
 *
 * @param {import('./assessment.mjs').AssessmentSummary} s
 * @returns {ComputedDimension[]}
 */
export function assessmentDimensions(s) {
  const EV = ['no evidence', 'anecdotal evidence', 'documented'];

  return s.dimensions.map((d) => ({
    label: d.label,
    value: clamp(d.adjustedPct),
    insight: d.unsupported
      ? `Rated ${d.scorePct}% with no evidence — discounted to ${d.adjustedPct}%.`
      : `${d.scorePct}% on ${EV[d.evidence]}, weight ${d.weight} of 3.`,
  }));
}
