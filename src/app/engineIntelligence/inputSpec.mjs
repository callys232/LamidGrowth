/**
 * Structured input specs for intelligence engines.
 *
 * Ported from LamidOne's src/lib/intelligence/inputSpec.ts. Every engine
 * declares a `kind`; the frontend renders a structured form for it and the
 * matching compute file (see ./index.mjs) turns that input into a real,
 * deterministic result — never a number the model invented.
 *
 * TypeScript interfaces became plain runtime shape comments below; the
 * `kind` discriminant still drives every dispatch, same as the original.
 */

/** A-Series modules that assess workforce STRUCTURE rather than sentiment. */
export const ROSTER_MODULES = new Set([
  'A02',
  'A03',
  'A04',
  'A06',
  'A21',
  'A22',
  'A24',
  'A25',
  'A26',
  'A28',
  'A30',
  'A31',
]);

/** Q-Series modules that model discrete CHOICES rather than capability. */
export const SCENARIO_MODULES = new Set(['Q05', 'Q24', 'Q46', 'Q59', 'Q60', 'Q61', 'Q69']);

/* ── Derived statistics — computed in JS, never by a model ── */

const round1 = (n) => Math.round(n * 10) / 10;

/**
 * @param {{key:string,label:string,unit:string,betterWhen:'higher'|'lower',target?:number}} metric
 * @param {number[]} values
 * @param {number|null} [targetOverride]
 */
export function computeSeriesStats(metric, values, targetOverride) {
  const clean = values.filter((v) => Number.isFinite(v));
  const n = clean.length;
  const target =
    targetOverride !== undefined && targetOverride !== null && Number.isFinite(targetOverride)
      ? targetOverride
      : (metric.target ?? null);

  if (n === 0) {
    return {
      key: metric.key,
      label: metric.label,
      unit: metric.unit,
      values: [],
      first: 0,
      last: 0,
      min: 0,
      max: 0,
      mean: 0,
      changePct: 0,
      volatility: 0,
      trend: 'flat',
      betterWhen: metric.betterWhen,
      target,
      targetGapPct: null,
      onTarget: null,
      attainment: null,
    };
  }

  const first = clean[0];
  const last = clean[n - 1];
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const mean = clean.reduce((a, b) => a + b, 0) / n;

  const changePct = first !== 0 ? round1(((last - first) / Math.abs(first)) * 100) : 0;

  let deltaSum = 0;
  for (let i = 1; i < n; i++) deltaSum += Math.abs(clean[i] - clean[i - 1]);
  const meanDelta = n > 1 ? deltaSum / (n - 1) : 0;
  const volatility = mean !== 0 ? round1((meanDelta / Math.abs(mean)) * 100) : 0;

  let trend;
  if (volatility > 25) trend = 'volatile';
  else if (changePct > 5) trend = 'rising';
  else if (changePct < -5) trend = 'falling';
  else trend = 'flat';

  let targetGapPct = null;
  let onTarget = null;
  let attainment = null;

  if (target !== null && target !== 0) {
    const raw = metric.betterWhen === 'higher' ? last / target : target / last;
    if (Number.isFinite(raw)) {
      attainment = round1(Math.max(0, Math.min(100, raw * 100)));
      onTarget = metric.betterWhen === 'higher' ? last >= target : last <= target;
      targetGapPct = round1(
        ((last - target) / Math.abs(target)) * 100 * (metric.betterWhen === 'higher' ? 1 : -1),
      );
    }
  }

  return {
    key: metric.key,
    label: metric.label,
    unit: metric.unit,
    values: clean,
    first,
    last,
    min,
    max,
    mean: round1(mean),
    changePct,
    volatility,
    trend,
    betterWhen: metric.betterWhen,
    target,
    targetGapPct,
    onTarget,
    attainment,
  };
}

/** Compact, deterministic summary text — never raw numbers handed to a model. */
export function seriesStatsToPrompt(stats, periodLabel) {
  return stats
    .map((s) => {
      const dir =
        s.trend === 'rising'
          ? `up ${s.changePct}%`
          : s.trend === 'falling'
            ? `down ${Math.abs(s.changePct)}%`
            : s.trend === 'volatile'
              ? `volatile (${s.volatility}% mean swing)`
              : 'flat';
      const vsTarget =
        s.target !== null && s.attainment !== null
          ? ` Target ${s.target}${s.unit} — currently ${s.onTarget ? 'met' : 'missed'} (${s.attainment}% attainment, ${s.targetGapPct >= 0 ? '+' : ''}${s.targetGapPct}% vs target).`
          : '';
      return `• ${s.label}: ${s.first}${s.unit} → ${s.last}${s.unit} over ${s.values.length} ${periodLabel.toLowerCase()}s — ${dir}. Range ${s.min}–${s.max}${s.unit}, mean ${s.mean}${s.unit}.${vsTarget}`;
    })
    .join('\n');
}

/* ── Shared metric sets ─────────────────────────────────────────────── */

/** R-Series — cadence, rhythm, operating tempo. */
export const CADENCE_METRICS = [
  {
    key: 'cycleTime',
    label: 'Delivery cycle time',
    unit: ' days',
    hint: 'Idea to shipped',
    sample: [14, 13, 15, 12, 11, 12],
    betterWhen: 'lower',
    target: 10,
  },
  {
    key: 'onTimeRate',
    label: 'On-time completion rate',
    unit: '%',
    hint: 'Committed work delivered',
    sample: [72, 75, 71, 78, 82, 80],
    betterWhen: 'higher',
    target: 85,
  },
  {
    key: 'meetingLoad',
    label: 'Hours in meetings / person / week',
    unit: ' hrs',
    hint: 'Coordination overhead',
    sample: [12, 13, 15, 14, 16, 17],
    betterWhen: 'lower',
    target: 10,
  },
];

/** P-Series — throughput, productivity, flow. */
export const PRODUCTIVITY_METRICS = [
  {
    key: 'throughput',
    label: 'Completed units of work',
    unit: ' items',
    hint: 'Tickets, deliverables, cases',
    sample: [42, 45, 41, 48, 52, 50],
    betterWhen: 'higher',
    target: 55,
  },
  {
    key: 'reworkRate',
    label: 'Rework / defect rate',
    unit: '%',
    hint: 'Work redone after delivery',
    sample: [18, 16, 19, 14, 12, 13],
    betterWhen: 'lower',
    target: 10,
  },
  {
    key: 'utilisation',
    label: 'Capacity utilisation',
    unit: '%',
    hint: 'Productive vs available time',
    sample: [68, 71, 74, 79, 84, 88],
    betterWhen: 'higher',
    target: 85,
  },
];
