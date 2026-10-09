import type { ReactNode } from 'react';
import samples from './demoVideoSamples.json';
import { appear, progress, sceneStyle, typed, type VideoProps } from './timeline';

/** The four "Start here" tools in motion: inputs fill in, the engine runs, the result builds.
 * Every result is a real engine output for the tool's built-in example (demoVideoSamples.json,
 * pinned by tests/demoVideoSamples.test.mjs). */
export const TOOL_DURATION = 9500;
const RUN_AT = 4300;
const RESULT_AT = RUN_AT + 1000;

function ToolFrame({
  t,
  name,
  inputs,
  result,
}: VideoProps & { name: string; inputs: ReactNode; result: ReactNode }) {
  return (
    <div className="dv-tool">
      <section className="dv-scene" style={sceneStyle(t, 0, RUN_AT)}>
        <span className="dv-eyebrow">{name} · your inputs</span>
        {inputs}
        <span className={t > RUN_AT - 450 ? 'dv-button is-pressed' : 'dv-button'}>
          Run diagnostic
        </span>
      </section>
      <section className="dv-scene dv-running" style={sceneStyle(t, RUN_AT, RESULT_AT)}>
        <span className="dv-spinner" aria-hidden="true" />
        Running {name}…
      </section>
      <section className="dv-scene" style={sceneStyle(t, RESULT_AT, TOOL_DURATION + 400)}>
        <span className="dv-eyebrow">{name} · result</span>
        {result}
      </section>
    </div>
  );
}

/** A 0–100 bar that grows in from `at`. */
function Bar({ t, at, pct, tone }: { t: number; at: number; pct: number; tone?: 'weak' | 'win' }) {
  return (
    <span className={tone ? `dv-bar is-${tone}` : 'dv-bar'}>
      <i style={{ width: `${pct * progress(t, at, at + 700)}%` }} />
    </span>
  );
}

// ---------- Purpose & Strategic Direction ----------
const PURPOSE_QUESTIONS = [
  'A written purpose and vision exist and leaders describe them the same way',
  'Values are defined as behaviours people can observe',
  'There is a small set of strategic priorities for the next 1–3 years',
  'Leaders can say what the organisation will not do',
  'Major spending decisions are checked against the priorities',
  'Hiring and promotion reflect the stated values',
];
const EVIDENCE = ['Opinion only', 'Some evidence', 'Documented evidence'];

export function PurposeVideo({ t }: VideoProps) {
  const answers = Object.values(samples.S01.input.answers);
  const r = samples.S01.result;
  return (
    <ToolFrame
      t={t}
      name="Purpose & Strategic Direction"
      inputs={
        <ul className="dv-rows">
          {PURPOSE_QUESTIONS.map((q, i) => {
            const at = 300 + i * 520;
            return (
              <li key={q}>
                <span className="dv-row-label">{q}</span>
                <span className="dv-levels" aria-hidden="true">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <i key={n} className={t > at && n <= answers[i].level ? 'is-on' : ''} />
                  ))}
                </span>
                <small style={appear(t, at + 200)}>{EVIDENCE[answers[i].evidence]}</small>
              </li>
            );
          })}
        </ul>
      }
      result={
        <div className="dv-result">
          <div className="dv-score">
            <b>{Math.round(r.overallPct * progress(t, RESULT_AT, RESULT_AT + 900))}%</b>
            <span className="dv-pill">{r.maturityLabel}</span>
          </div>
          <ul className="dv-bars">
            {r.sections.map((s, i) => (
              <li key={s.label} className={s.label === r.weakestArea ? 'is-weak' : ''}>
                <span>{s.label}</span>
                <Bar
                  t={t}
                  at={RESULT_AT + 300 + i * 150}
                  pct={s.scorePct}
                  tone={s.label === r.weakestArea ? 'weak' : undefined}
                />
                <span className="dv-num">{Math.round(s.scorePct)}%</span>
              </li>
            ))}
          </ul>
          <p className="dv-callout" style={appear(t, RESULT_AT + 1600)}>
            <small>Weakest area</small>
            {r.weakestArea}
          </p>
        </div>
      }
    />
  );
}

// ---------- Financial Health Ratios ----------
const money = (n: number) => `£${n.toLocaleString('en-GB')}`;

export function FinanceVideo({ t }: VideoProps) {
  const input = samples.F01.input;
  const r = samples.F01.result;
  const cells = input.periods.flatMap((p, i) => [
    { key: `r${i}`, label: 'Revenue', value: p.revenue, month: i },
    { key: `c${i}`, label: 'Cost of sales', value: p.cogs, month: i },
    { key: `o${i}`, label: 'Operating costs', value: p.opex, month: i },
  ]);
  const maxRevenue = Math.max(...r.periods.map((p) => p.revenue));
  return (
    <ToolFrame
      t={t}
      name="Financial Health Ratios"
      inputs={
        <div className="dv-sheet">
          <div className="dv-sheet-head">
            <span />
            <b>Month 1</b>
            <b>Month 2</b>
          </div>
          {['Revenue', 'Cost of sales', 'Operating costs'].map((label) => (
            <div key={label} className="dv-sheet-row">
              <span>{label}</span>
              {cells
                .filter((c) => c.label === label)
                .map((c) => {
                  const order = cells.indexOf(c);
                  const at = 300 + (order % 3) * 900 + c.month * 420;
                  return <b key={c.key}>{typed(money(c.value), t, at, at + 380)}</b>;
                })}
            </div>
          ))}
          <div className="dv-sheet-meta" style={appear(t, 3000)}>
            <span>Cash {money(input.cashBalance)}</span>
            <span>Headcount {input.headcount}</span>
          </div>
        </div>
      }
      result={
        <div className="dv-result">
          <ul className="dv-kpis">
            {[
              ['Gross margin', `${r.grossMarginPct.toFixed(1)}%`],
              ['Operating margin', `${r.operatingMarginPct.toFixed(1)}%`],
              ['Revenue growth', `${r.revenueGrowthPct}%`],
              ['Revenue per head', money(r.revenuePerHead)],
            ].map(([label, value], i) => (
              <li key={label} style={appear(t, RESULT_AT + i * 160)}>
                <small>{label}</small>
                <b>{value}</b>
              </li>
            ))}
          </ul>
          <div className="dv-columns" aria-hidden="true">
            {r.periods.map((p, i) => (
              <div key={i}>
                <span
                  className="dv-column"
                  style={{
                    height: `${(p.revenue / maxRevenue) * 100 * progress(t, RESULT_AT + 700 + i * 200, RESULT_AT + 1500 + i * 200)}%`,
                  }}
                >
                  <small>{money(p.revenue)}</small>
                </span>
                <em>
                  Month {i + 1} · {p.operatingMarginPct.toFixed(1)}% operating
                </em>
              </div>
            ))}
          </div>
        </div>
      }
    />
  );
}

// ---------- Option Comparison ----------
export function OptionsVideo({ t }: VideoProps) {
  const { criteria, options } = samples.Q21.input;
  const r = samples.Q21.result;
  const fragile = r.sensitivity[0];
  return (
    <ToolFrame
      t={t}
      name="Option Comparison"
      inputs={
        <div className="dv-matrix">
          <div className="dv-matrix-row dv-matrix-head">
            <span>Option</span>
            {criteria.map((c, i) => (
              <b key={c.id} style={appear(t, 300 + i * 400)}>
                {c.name}
                <small>
                  weight {c.weight} ·{' '}
                  {c.direction === 'lower_better' ? 'lower wins' : 'higher wins'}
                </small>
              </b>
            ))}
          </div>
          {options.map((o, row) => (
            <div key={o.id} className="dv-matrix-row" style={appear(t, 1300 + row * 500)}>
              <span>{o.name}</span>
              {criteria.map((c, col) => {
                const at = 1700 + row * 900 + col * 400;
                const raw = o.scores[c.id as keyof typeof o.scores];
                return <b key={c.id}>{typed(String(raw), t, at, at + 300)}</b>;
              })}
            </div>
          ))}
        </div>
      }
      result={
        <div className="dv-result">
          <ul className="dv-bars dv-bars-wide">
            {r.ranked.map((o, i) => (
              <li key={o.name} className={o.name === r.winner ? 'is-win' : ''}>
                <span>{o.name}</span>
                <Bar
                  t={t}
                  at={RESULT_AT + 200 + i * 200}
                  pct={o.totalPct}
                  tone={o.name === r.winner ? 'win' : undefined}
                />
                <span className="dv-num">{o.totalPct}%</span>
              </li>
            ))}
          </ul>
          <p className="dv-callout is-win" style={appear(t, RESULT_AT + 1200)}>
            <small>Winner</small>
            {r.winner}
          </p>
          <p className="dv-callout" style={appear(t, RESULT_AT + 2000)}>
            <small>How fragile is the win?</small>
            If {fragile.name}’s weight ({fragile.currentWeightPct}%){' '}
            {fragile.direction === 'decrease' ? 'drops' : 'rises'} by {fragile.flipDistancePct}{' '}
            points, {fragile.flipsTo} wins instead.
          </p>
        </div>
      }
    />
  );
}

// ---------- Root Cause Analysis ----------
const EVIDENCE_LABEL: Record<string, string> = {
  strong: 'Strong evidence',
  some: 'Some evidence',
  none: 'No evidence yet',
};

export function RootCauseVideo({ t }: VideoProps) {
  const input = samples.R25.input;
  const r = samples.R25.result;
  const leading = r.roots.find((x) => x.root === r.mostProbable)!;
  return (
    <ToolFrame
      t={t}
      name="Root Cause Analysis"
      inputs={
        <div className="dv-problem">
          <label className="dv-field">
            <span>Problem</span>
            <b>{typed(input.problem, t, 200, 1800)}</b>
          </label>
          <label className="dv-field">
            <span>Where it does not happen</span>
            <b>{typed(input.isNot, t, 1900, 2700)}</b>
          </label>
          <ul className="dv-causes">
            {input.causes.map((c, i) => (
              <li key={c.cause} style={appear(t, 2800 + i * 300)}>
                {c.cause}
                <small>{c.category}</small>
              </li>
            ))}
          </ul>
        </div>
      }
      result={
        <div className="dv-result">
          <ol className="dv-chain">
            {leading.chain.map((step, i) => (
              <li
                key={step}
                className={step === leading.root ? 'is-root' : ''}
                style={appear(t, RESULT_AT + 200 + i * 450)}
              >
                {step}
                {step === leading.root && (
                  <small>
                    Root cause · {leading.category} · {EVIDENCE_LABEL[leading.evidence]}
                  </small>
                )}
              </li>
            ))}
          </ol>
          <p className="dv-callout" style={appear(t, RESULT_AT + 1900)}>
            <small>Not yet considered</small>
            {r.categoriesNotConsidered.join(' · ')}
          </p>
        </div>
      }
    />
  );
}
