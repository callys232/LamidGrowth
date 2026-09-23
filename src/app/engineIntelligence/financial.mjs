/**
 * Financial engine (F-series) — ported from LamidOne's
 * src/lib/intelligence/financial.ts.
 *
 * Same contract as the rest of this engine layer: the application computes
 * every figure, nothing is left for a model to guess. Margins, burn, and
 * runway are arithmetic — a model asked to produce them will hallucinate
 * plausible-looking numbers instead.
 */

/**
 * Operating cost lines. Opex used to be a single number, which meant cost
 * analysis could report the total and nothing else — there is no way to
 * locate waste inside one figure. Splitting it lets the engine rank cost
 * lines, measure concentration, and track which line is growing faster
 * than revenue.
 */
export const OPEX_CATEGORIES = [
  'Payroll & Benefits',
  'Software & Subscriptions',
  'Facilities & Utilities',
  'Marketing & Sales',
  'Professional Fees',
  'Travel & Expenses',
  'Other Operating Costs',
];

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const safe = (n) => {
  const v = typeof n === 'number' ? n : Number(n);
  return Number.isFinite(v) ? v : 0;
};
const pct = (part, whole) => (whole === 0 ? 0 : r2((part / whole) * 100));

/**
 * @param {{currency:string, periodLabel:string, periods:Array<{revenue:number,cogs:number,opex:number,opexBreakdown?:Record<string,number>}>, cashBalance:number, headcount:number}} input
 */
export function computeFinancials(input) {
  const warnings = [];
  const periods = input.periods.map((p) => ({
    revenue: safe(p.revenue),
    cogs: safe(p.cogs),
    opex: safe(p.opex),
  }));

  const periodsDerived = periods.map((p, i) => {
    const grossProfit = r2(p.revenue - p.cogs);
    const operatingProfit = r2(grossProfit - p.opex);
    return {
      ...p,
      index: i + 1,
      grossProfit,
      grossMarginPct: pct(grossProfit, p.revenue),
      operatingProfit,
      operatingMarginPct: pct(operatingProfit, p.revenue),
    };
  });

  const sum = (k) => r2(periods.reduce((a, p) => a + p[k], 0));
  const totalRevenue = sum('revenue');
  const totalCogs = sum('cogs');
  const totalOpex = sum('opex');

  const grossProfit = r2(totalRevenue - totalCogs);
  const operatingProfit = r2(grossProfit - totalOpex);

  const first = periods[0]?.revenue ?? 0;
  const last = periods[periods.length - 1]?.revenue ?? 0;
  const revenueGrowthPct = first !== 0 ? r2(((last - first) / Math.abs(first)) * 100) : 0;

  const netBurnPerPeriod = periods.length ? r2(operatingProfit / periods.length) : 0;

  const cash = safe(input.cashBalance);
  const runwayPeriods = netBurnPerPeriod < 0 ? r2(cash / Math.abs(netBurnPerPeriod)) : null;

  const headcount = Math.max(0, safe(input.headcount));
  const revenuePerHead = headcount > 0 ? r2(totalRevenue / headcount) : 0;

  if (totalRevenue === 0) {
    warnings.push('No revenue entered — margin and runway figures will not be meaningful.');
  }
  const gm = pct(grossProfit, totalRevenue);
  if (totalRevenue > 0 && gm < 20) {
    warnings.push(
      `Gross margin is ${gm}% — below the level most businesses can sustain operating costs on.`,
    );
  }
  if (runwayPeriods !== null && runwayPeriods < 6) {
    warnings.push(
      `Runway is ${runwayPeriods} ${input.periodLabel.toLowerCase()}s at current burn — inside the typical fundraise window.`,
    );
  }
  const opexRatio = pct(totalOpex, totalRevenue);
  if (totalRevenue > 0 && opexRatio > 60) {
    warnings.push(
      `Operating expenses are ${opexRatio}% of revenue — concentration worth reviewing.`,
    );
  }
  if (headcount === 0) {
    warnings.push('Headcount not entered — revenue per head unavailable.');
  }

  const opexLines = deriveOpexLines(input.periods, totalOpex, totalRevenue, revenueGrowthPct);
  const concentrationPct = opexLines.length ? opexLines[0].pctOfOpex : 0;
  const outpacingLines = opexLines.filter((l) => l.outpacingRevenue).map((l) => l.category);

  if (opexLines.length && concentrationPct > 50) {
    warnings.push(
      `${opexLines[0].category} is ${concentrationPct}% of operating cost — a single line carrying more than half the base.`,
    );
  }
  if (outpacingLines.length) {
    warnings.push(
      `Growing faster than revenue: ${outpacingLines.join(', ')}. These are where cost is getting away.`,
    );
  }

  return {
    currency: input.currency,
    periodLabel: input.periodLabel,
    totalRevenue,
    totalCogs,
    totalOpex,
    grossProfit,
    operatingProfit,
    grossMarginPct: gm,
    operatingMarginPct: pct(operatingProfit, totalRevenue),
    revenueGrowthPct,
    netBurnPerPeriod,
    runwayPeriods,
    revenuePerHead,
    opexRatioPct: opexRatio,
    opexLines,
    concentrationPct,
    outpacingLines,
    periodsDerived,
    warnings,
  };
}

/** Aggregates the per-period opex split into ranked cost lines. */
function deriveOpexLines(periods, _totalOpex, _totalRevenue, revenueGrowthPct) {
  const withSplit = periods.filter((p) => p.opexBreakdown && Object.keys(p.opexBreakdown).length);
  if (withSplit.length === 0) return [];

  const totalOpex = r2(withSplit.reduce((a, p) => a + safe(p.opex), 0));
  const totalRevenue = r2(withSplit.reduce((a, p) => a + safe(p.revenue), 0));

  const totals = new Map();
  for (const p of withSplit) {
    for (const [cat, amount] of Object.entries(p.opexBreakdown)) {
      totals.set(cat, (totals.get(cat) ?? 0) + safe(amount));
    }
  }

  const firstSplit = withSplit[0].opexBreakdown;
  const lastSplit = withSplit[withSplit.length - 1].opexBreakdown;

  return [...totals.entries()]
    .map(([category, total]) => {
      const first = safe(firstSplit[category]);
      const last = safe(lastSplit[category]);
      const growthPct = first !== 0 ? r2(((last - first) / Math.abs(first)) * 100) : 0;
      return {
        category,
        total: r2(total),
        pctOfOpex: pct(total, totalOpex),
        pctOfRevenue: pct(total, totalRevenue),
        growthPct,
        outpacingRevenue: withSplit.length > 1 && growthPct > revenueGrowthPct && growthPct > 0,
      };
    })
    .sort((a, b) => b.total - a.total);
}

/** Deterministic summary — the model, if any, never sees raw arrays. */
export function financialsToPrompt(s) {
  const c = s.currency;
  const lines = [
    `• Total revenue: ${c} ${s.totalRevenue.toLocaleString()} across ${s.periodsDerived.length} ${s.periodLabel.toLowerCase()}s`,
    `• Revenue growth first→last period: ${s.revenueGrowthPct}%`,
    `• Gross profit: ${c} ${s.grossProfit.toLocaleString()} (${s.grossMarginPct}% margin)`,
    `• Operating profit: ${c} ${s.operatingProfit.toLocaleString()} (${s.operatingMarginPct}% margin)`,
    `• Operating expenses: ${s.opexRatioPct}% of revenue`,
    `• Net position per ${s.periodLabel.toLowerCase()}: ${c} ${s.netBurnPerPeriod.toLocaleString()}`,
  ];
  if (s.runwayPeriods !== null) {
    lines.push(`• Runway: ${s.runwayPeriods} ${s.periodLabel.toLowerCase()}s at current burn`);
  } else {
    lines.push(`• Operating profitably — no burn runway applies`);
  }
  if (s.revenuePerHead > 0) {
    lines.push(`• Revenue per head: ${c} ${s.revenuePerHead.toLocaleString()}`);
  }
  if (s.opexLines.length) {
    lines.push(`• Operating cost by line (largest first):`);
    for (const l of s.opexLines) {
      lines.push(
        `   – ${l.category}: ${c} ${l.total.toLocaleString()} — ${l.pctOfOpex}% of opex, ${l.pctOfRevenue}% of revenue, ${l.growthPct >= 0 ? '+' : ''}${l.growthPct}% growth${l.outpacingRevenue ? ' (outpacing revenue)' : ''}`,
      );
    }
    lines.push(`• Cost concentration: ${s.concentrationPct}% in the largest line`);
  }
  return lines.join('\n');
}
