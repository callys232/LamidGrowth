import { F, dict, r1, r2, sum, pct, money, list, result, ToolInputError } from '../schema.mjs';

/* T51 — Growth Opportunity Scoring (RICE; Ansoff; Three Horizons) */
const IMPACT = [
  { value: 0.25, label: 'Minimal (0.25)' },
  { value: 0.5, label: 'Low (0.5)' },
  { value: 1, label: 'Medium (1)' },
  { value: 2, label: 'High (2)' },
  { value: 3, label: 'Massive (3)' },
];
export const rice = {
  fields: [],
  tables: [
    {
      key: 'opportunities',
      label: 'Opportunities',
      minRows: 1,
      columns: [
        F.text('opportunity', 'Opportunity', { required: true }),
        F.select(
          'horizon',
          'Horizon',
          ['H1 — extend the core', 'H2 — build emerging business', 'H3 — create future options'],
          { required: true },
        ),
        F.select(
          'ansoff',
          'Ansoff move',
          ['market penetration', 'product development', 'market development', 'diversification'],
          { required: true },
        ),
        F.num('reach', 'Customers or users reached per year', { required: true, min: 0 }),
        F.select('impact', 'Impact on each', IMPACT, { required: true }),
        F.pct('confidence', 'Confidence in these estimates (%)', { required: true }),
        F.num('effort', 'Effort (person-months)', { required: true, min: 0.1 }),
      ],
    },
  ],
  compute({ opportunities }) {
    const rows = opportunities
      .map((o) => ({
        ...o,
        score: Math.round((o.reach * o.impact * (o.confidence / 100)) / o.effort),
      }))
      .sort((a, b) => b.score - a.score);
    const effortBy = dict();
    const total = sum(rows.map((r) => r.effort));
    for (const r of rows)
      effortBy[r.horizon.slice(0, 2)] = (effortBy[r.horizon.slice(0, 2)] ?? 0) + r.effort;
    const mix = Object.fromEntries(
      ['H1', 'H2', 'H3'].map((h) => [h, pct(effortBy[h] ?? 0, total)]),
    );
    const warnings = [];
    if (mix.H1 > 85)
      warnings.push(
        'Over 85% of effort goes to the core business. Little is building the next one.',
      );
    if (mix.H3 > 30)
      warnings.push('Over 30% of effort is on long-range options; check the core is funded.');
    const div = rows.filter((r) => r.ansoff === 'diversification' && r.confidence >= 70);
    if (div.length)
      warnings.push(
        'Diversification (new product, new market) is the riskiest Ansoff move; high confidence there deserves a second look.',
      );
    const summary = { ranked: rows, effortMixPct: mix };
    return result(
      'Growth Opportunity Scoring — RICE score with Ansoff and Three Horizons mix',
      summary,
      [
        `Effort mix: H1 ${mix.H1}%, H2 ${mix.H2}%, H3 ${mix.H3}% (a common reference point is roughly 70/20/10).`,
        ...rows.map(
          (r, i) =>
            `${i + 1}. ${r.opportunity}: RICE ${r.score} (${r.horizon.slice(0, 2)}, ${r.ansoff}).`,
        ),
      ],
      warnings,
    );
  },
  computes:
    'RICE score (reach × impact × confidence ÷ effort) for each opportunity and the effort mix across the three horizons.',
  limits: 'All inputs are your estimates; it does not research markets.',
};

/* T57 — Rolling Forecast & 13-Week Cash */
const PER_WEEKS = { weekly: 1, fortnightly: 2, 'four-weekly': 4 };
export const forecast = {
  fields: [
    F.num('openingCash', 'Cash today', { required: true }),
    F.num('minimumCash', 'Minimum cash you need to hold', { default: 0, min: 0 }),
    F.num('monthlyRevenue', 'Current monthly revenue', { min: 0 }),
    F.num('revenueGrowthPct', 'Expected monthly revenue growth (%)', {
      min: -100,
      max: 100,
      default: 0,
    }),
    F.num('monthlyCosts', 'Current monthly costs', { min: 0 }),
    F.num('costGrowthPct', 'Expected monthly cost growth (%)', { min: -100, max: 100, default: 0 }),
  ],
  tables: [
    {
      key: 'flows',
      label: 'Cash in and out over the next 13 weeks',
      minRows: 1,
      columns: [
        F.text('item', 'Item', { required: true }),
        F.select('type', 'Type', ['receipt', 'payment'], { required: true }),
        F.num('amount', 'Amount', { required: true, min: 0 }),
        F.select('repeat', 'Repeats', ['once', 'weekly', 'fortnightly', 'four-weekly'], {
          required: true,
        }),
        F.scale('startWeek', 'First week (1–13)', 1, 13, { required: true }),
      ],
    },
  ],
  compute(i) {
    const weeks = Array.from({ length: 13 }, (_, w) => ({ week: w + 1, receipts: 0, payments: 0 }));
    for (const f of i.flows) {
      const step = PER_WEEKS[f.repeat];
      for (let w = f.startWeek; w <= 13; w += step ?? 99) {
        weeks[w - 1][f.type === 'receipt' ? 'receipts' : 'payments'] += f.amount;
        if (!step) break;
      }
    }
    let bal = i.openingCash;
    for (const w of weeks) {
      bal += w.receipts - w.payments;
      w.closing = Math.round(bal);
    }
    const low = weeks.reduce((a, b) => (b.closing < a.closing ? b : a));
    const below = weeks.filter((w) => w.closing < (i.minimumCash ?? 0)).map((w) => w.week);
    const warnings = [];
    if (below.length) warnings.push(`Cash falls below the minimum in week(s) ${below.join(', ')}.`);
    let monthly = null;
    if (i.monthlyRevenue != null && i.monthlyCosts != null) {
      monthly = [];
      let rev = i.monthlyRevenue,
        cost = i.monthlyCosts,
        cash = i.openingCash;
      let breakeven = null,
        runout = null;
      for (let m = 1; m <= 12; m++) {
        if (m > 1) {
          rev *= 1 + i.revenueGrowthPct / 100;
          cost *= 1 + i.costGrowthPct / 100;
        }
        cash += rev - cost;
        if (breakeven === null && rev >= cost) breakeven = m;
        if (runout === null && cash < 0) runout = m;
        monthly.push({
          month: m,
          revenue: Math.round(rev),
          costs: Math.round(cost),
          net: Math.round(rev - cost),
          cash: Math.round(cash),
        });
      }
      monthly = { months: monthly, breakevenMonth: breakeven, cashRunsOutMonth: runout };
      if (runout) warnings.push(`On the monthly forecast, cash runs out in month ${runout}.`);
    }
    warnings.push('A forecast is only as good as its assumptions; update it weekly with actuals.');
    const summary = {
      weeks,
      lowestWeek: low.week,
      lowestCash: low.closing,
      weeksBelowMinimum: below,
      endingCash: weeks[12].closing,
      rollingForecast: monthly,
    };
    return result(
      'Rolling Forecast & 13-Week Cash — direct-method 13-week cash flow with a driver-based 12-month forecast',
      summary,
      [
        `Cash today ${money(i.openingCash)}; lowest point ${money(low.closing)} in week ${low.week}; week 13 ${money(weeks[12].closing)}.`,
        below.length
          ? `Below the ${money(i.minimumCash ?? 0)} minimum in weeks ${below.join(', ')}.`
          : 'Cash stays above the minimum for all 13 weeks.',
        monthly
          ? `12-month view: break-even ${monthly.breakevenMonth ? `in month ${monthly.breakevenMonth}` : 'not reached'}; cash ${monthly.cashRunsOutMonth ? `runs out in month ${monthly.cashRunsOutMonth}` : `ends at ${money(monthly.months[11].cash)}`}.`
          : '',
      ],
      warnings,
    );
  },
  computes:
    'Week-by-week cash for the next 13 weeks with the low point, and a 12-month revenue, cost and cash projection from your growth assumptions.',
  limits:
    'It projects from the flows and growth rates you enter; it does not know about payments you have not listed.',
};

/* T58 — KPI Driver Tree (DuPont analysis) */
export const dupont = {
  fields: [
    F.num('revenue', 'Revenue', { required: true, min: 0.01 }),
    F.num('netIncome', 'Net profit', { required: true }),
    F.num('assets', 'Total assets', { required: true, min: 0.01 }),
    F.num('equity', 'Shareholders’ equity', { required: true, min: 0.01 }),
    F.num('priorRevenue', 'Prior period revenue', { min: 0.01 }),
    F.num('priorNetIncome', 'Prior period net profit'),
    F.num('priorAssets', 'Prior period total assets', { min: 0.01 }),
    F.num('priorEquity', 'Prior period equity', { min: 0.01 }),
  ],
  tables: [],
  compute(i) {
    const calc = (rev, ni, a, e) => ({
      margin: ni / rev,
      turnover: rev / a,
      leverage: a / e,
      roe: ni / e,
    });
    const now = calc(i.revenue, i.netIncome, i.assets, i.equity);
    const fmt = (d) => ({
      netMarginPct: r1(d.margin * 100),
      assetTurnover: r2(d.turnover),
      equityMultiplier: r2(d.leverage),
      roePct: r1(d.roe * 100),
    });
    const summary = { current: fmt(now), prior: null, drivers: null };
    const lines = [
      `ROE ${summary.current.roePct}% = net margin ${summary.current.netMarginPct}% × asset turnover ${summary.current.assetTurnover} × equity multiplier ${summary.current.equityMultiplier}.`,
    ];
    const warnings = [];
    if (now.leverage > 3)
      warnings.push(
        'Over two-thirds of assets are funded by debt or other liabilities; part of the return comes from leverage, which adds risk.',
      );
    if ([i.priorRevenue, i.priorNetIncome, i.priorAssets, i.priorEquity].every((v) => v != null)) {
      const p = calc(i.priorRevenue, i.priorNetIncome, i.priorAssets, i.priorEquity);
      summary.prior = fmt(p);
      const change = (a, b) => (b !== 0 ? (a - b) / Math.abs(b) : 0);
      const drivers = [
        { driver: 'net margin', changePct: r1(change(now.margin, p.margin) * 100) },
        { driver: 'asset turnover', changePct: r1(change(now.turnover, p.turnover) * 100) },
        { driver: 'equity multiplier', changePct: r1(change(now.leverage, p.leverage) * 100) },
      ].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
      summary.drivers = drivers;
      lines.push(
        `Prior ROE ${summary.prior.roePct}%. Biggest mover: ${drivers[0].driver} (${drivers[0].changePct}%).`,
      );
      if (drivers[0].driver === 'equity multiplier')
        warnings.push('The change in return came mostly from leverage, not from operations.');
    }
    return result(
      'KPI Driver Tree — DuPont analysis of return on equity',
      summary,
      lines,
      warnings,
    );
  },
  computes:
    'Splits return on equity into margin, asset turnover and leverage, and shows which driver moved it since the prior period.',
  limits: 'Uses the totals you enter; it does not read accounts or adjust for one-off items.',
};

/* T59 — Cost & Spend Analysis (Pareto / ABC) */
export const spend = {
  fields: [],
  tables: [
    {
      key: 'lines',
      label: 'Cost lines',
      minRows: 2,
      columns: [
        F.text('line', 'Cost line or supplier', { required: true }),
        F.text('category', 'Category', { required: true }),
        F.num('amount', 'Amount this period', { required: true, min: 0 }),
        F.num('prior', 'Amount prior period', { min: 0 }),
      ],
    },
  ],
  compute({ lines }) {
    const total = sum(lines.map((l) => l.amount));
    let cum = 0;
    const rows = [...lines]
      .sort((a, b) => b.amount - a.amount)
      .map((l) => {
        cum += l.amount;
        const cumPct = pct(cum, total);
        return {
          ...l,
          sharePct: pct(l.amount, total),
          cumulativePct: cumPct,
          class:
            cumPct - pct(l.amount, total) < 80
              ? 'A'
              : cumPct - pct(l.amount, total) < 95
                ? 'B'
                : 'C',
          growthPct: l.prior ? r1(((l.amount - l.prior) / l.prior) * 100) : null,
        };
      });
    const cats = dict();
    for (const r of rows) cats[r.category] = (cats[r.category] ?? 0) + r.amount;
    const byCategory = Object.entries(cats)
      .map(([category, amount]) => ({ category, amount, sharePct: pct(amount, total) }))
      .sort((a, b) => b.amount - a.amount);
    const A = rows.filter((r) => r.class === 'A');
    const growing = rows.filter((r) => r.growthPct !== null && r.growthPct > 20);
    const warnings = [];
    if (growing.length)
      warnings.push(
        `Up more than 20% on the prior period: ${list(growing.map((r) => `${r.line} (+${r.growthPct}%)`))}.`,
      );
    const summary = {
      total,
      classA: A.map((r) => r.line),
      classACount: A.length,
      classASharePct: pct(sum(A.map((r) => r.amount)), total),
      lines: rows,
      byCategory,
    };
    return result(
      'Cost & Spend Analysis — Pareto (ABC) classification',
      summary,
      [
        `${A.length} of ${rows.length} lines (${pct(A.length, rows.length)}%) make up ${summary.classASharePct}% of spend. Focus savings work there.`,
        ...byCategory.map((c) => `- ${c.category}: ${money(c.amount)} (${c.sharePct}%).`),
        ...A.map(
          (r) =>
            `  · A: ${r.line} ${money(r.amount)}${r.growthPct !== null ? ` (${r.growthPct >= 0 ? '+' : ''}${r.growthPct}%)` : ''}.`,
        ),
      ],
      warnings,
    );
  },
  computes:
    'Ranks cost lines into A, B and C classes by cumulative share of spend, totals by category, and flags fast-growing lines.',
  limits: 'Finds where spend is concentrated, not whether it is wasteful.',
};

/* T60 — Business Valuation (discounted cash flow; IVS 105) */
export const dcf = {
  fields: [
    F.num('discountRatePct', 'Discount rate (%)', { required: true, min: 0.1, max: 60 }),
    F.num('terminalGrowthPct', 'Long-term growth after the forecast (%)', {
      required: true,
      min: -5,
      max: 10,
    }),
    F.num('netDebt', 'Net debt (debt minus cash)', { default: 0 }),
  ],
  tables: [
    {
      key: 'years',
      label: 'Forecast free cash flow',
      hint: 'at least 3 years',
      minRows: 3,
      maxRows: 15,
      columns: [
        F.text('year', 'Year', { required: true }),
        F.num('fcf', 'Free cash flow', { required: true }),
      ],
    },
  ],
  compute({ discountRatePct, terminalGrowthPct, netDebt, years }) {
    const value = (r, g) => {
      if (g >= r) throw new ToolInputError('Long-term growth must be below the discount rate.');
      const pv = years.map((y, t) => y.fcf / (1 + r) ** (t + 1));
      const last = years[years.length - 1].fcf;
      const tv = (last * (1 + g)) / (r - g);
      const pvTv = tv / (1 + r) ** years.length;
      return { pvForecast: sum(pv), pvTerminal: pvTv, ev: sum(pv) + pvTv };
    };
    const r = discountRatePct / 100,
      g = terminalGrowthPct / 100;
    const base = value(r, g);
    const grid = [];
    for (const dr of [-0.01, 0, 0.01])
      for (const dg of [-0.005, 0, 0.005]) {
        if (g + dg < r + dr)
          grid.push({
            discountRatePct: r1((r + dr) * 100),
            growthPct: r1((g + dg) * 100),
            equityValue: Math.round(value(r + dr, g + dg).ev - (netDebt ?? 0)),
          });
      }
    const vals = grid.map((x) => x.equityValue);
    const tvShare = pct(base.pvTerminal, base.ev);
    const warnings = [];
    if (tvShare > 75)
      warnings.push(
        `${tvShare}% of the value comes from the years after the forecast. The result depends heavily on the long-term growth assumption.`,
      );
    if (years[years.length - 1].fcf < 0)
      warnings.push(
        'Final-year cash flow is negative, so the terminal value is negative. Extend the forecast to a steady state.',
      );
    const summary = {
      enterpriseValue: Math.round(base.ev),
      equityValue: Math.round(base.ev - (netDebt ?? 0)),
      terminalValueSharePct: tvShare,
      range: { low: Math.min(...vals), high: Math.max(...vals) },
      sensitivity: grid,
    };
    return result(
      'Business Valuation — discounted cash flow (income approach, IVS 105)',
      summary,
      [
        `Enterprise value ${money(summary.enterpriseValue)}; equity value ${money(summary.equityValue)} after net debt of ${money(netDebt ?? 0)}.`,
        `Range across ±1% discount rate and ±0.5% growth: ${money(summary.range.low)} to ${money(summary.range.high)}.`,
        `Share of value from beyond the forecast: ${tvShare}%.`,
      ],
      warnings,
    );
  },
  computes:
    'Enterprise and equity value from your cash-flow forecast, discount rate and long-term growth, with a sensitivity range.',
  limits:
    'An indicative income-approach value only; it is not a formal valuation opinion and uses your forecast as given.',
};
