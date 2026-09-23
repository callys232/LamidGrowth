import { useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import type { SeriesMetric } from '../hooks/useEngineRun';
import './engine-forms.css';

/** R/P/X-series input — one value-grid row per declared metric, matching computeSeriesStats()'s
 * expected {metric, values} shape in src/app/engineIntelligence/inputSpec.mjs. Pre-filled with each
 * metric's `sample` values so the form is never empty on first load, same as the LamidOne source. */
export function TimeseriesForm({
  periodLabel,
  periods,
  metrics,
  onSubmit,
  submitting,
}: {
  periodLabel: string;
  periods: number;
  metrics: SeriesMetric[];
  onSubmit: (input: {
    periodLabel: string;
    series: { metric: SeriesMetric; values: number[]; target?: number }[];
  }) => void;
  submitting: boolean;
}) {
  const [values, setValues] = useState<number[][]>(
    metrics.map((m) =>
      m.sample && m.sample.length === periods
        ? [...m.sample]
        : Array.from({ length: periods }, () => 0),
    ),
  );

  function update(metricIdx: number, periodIdx: number, value: number) {
    setValues((prev) =>
      prev.map((row, i) =>
        i === metricIdx ? row.map((v, j) => (j === periodIdx ? value : v)) : row,
      ),
    );
  }

  return (
    <form
      className="engine-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          periodLabel,
          series: metrics.map((metric, i) => ({
            metric,
            values: values[i],
            target: metric.target,
          })),
        });
      }}
    >
      {metrics.map((metric, mi) => (
        <fieldset key={metric.key} className="engine-form-row">
          <legend>
            {metric.label}{' '}
            <span className="engine-form-unit">
              ({metric.unit.trim()}, {metric.betterWhen} is better)
            </span>
          </legend>
          {metric.hint && <p className="engine-form-hint">{metric.hint}</p>}
          <div className="engine-form-series">
            {Array.from({ length: periods }, (_, pi) => (
              <label key={pi}>
                {periodLabel} {pi + 1}
                <input
                  type="number"
                  value={values[mi][pi]}
                  onChange={(e) => update(mi, pi, Number(e.target.value))}
                />
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Running…' : 'Run diagnostic'}
      </Button>
    </form>
  );
}
