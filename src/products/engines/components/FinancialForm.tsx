import { useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import './engine-forms.css';

type Period = { revenue: number; cogs: number; opex: number };

/** F-series input — matches computeFinancials()'s FinancialInputs shape in
 * src/app/engineIntelligence/financial.mjs (currency, periodLabel, periods[], cashBalance, headcount).
 * Opex breakdown by category is deliberately left out of this first cut of the form — the engine
 * accepts a total-only opex per period and still computes every headline figure. */
export function FinancialForm({
  periodLabel,
  periods: periodCount,
  onSubmit,
  submitting,
}: {
  periodLabel: string;
  periods: number;
  onSubmit: (input: {
    currency: string;
    periodLabel: string;
    periods: Period[];
    cashBalance: number;
    headcount: number;
  }) => void;
  submitting: boolean;
}) {
  const [currency, setCurrency] = useState('USD');
  const [cashBalance, setCashBalance] = useState(0);
  const [headcount, setHeadcount] = useState(0);
  const [periods, setPeriods] = useState<Period[]>(
    Array.from({ length: periodCount }, () => ({ revenue: 0, cogs: 0, opex: 0 })),
  );

  function update(i: number, patch: Partial<Period>) {
    setPeriods((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  const hasRevenue = periods.some((p) => p.revenue > 0);

  return (
    <form
      className="engine-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ currency, periodLabel, periods, cashBalance, headcount });
      }}
    >
      <div className="engine-form-row engine-form-row-inline">
        <label>
          Currency
          <input type="text" maxLength={8} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
        </label>
        <label>
          Cash balance
          <input type="number" min={0} value={cashBalance} onChange={(e) => setCashBalance(Number(e.target.value))} />
        </label>
        <label>
          Headcount
          <input type="number" min={0} value={headcount} onChange={(e) => setHeadcount(Number(e.target.value))} />
        </label>
      </div>

      <table className="engine-form-grid">
        <thead>
          <tr>
            <th>{periodLabel}</th>
            <th>Revenue</th>
            <th>COGS</th>
            <th>Opex</th>
          </tr>
        </thead>
        <tbody>
          {periods.map((p, i) => (
            <tr key={i}>
              <td>{periodLabel} {i + 1}</td>
              <td>
                <input type="number" value={p.revenue} onChange={(e) => update(i, { revenue: Number(e.target.value) })} />
              </td>
              <td>
                <input type="number" value={p.cogs} onChange={(e) => update(i, { cogs: Number(e.target.value) })} />
              </td>
              <td>
                <input type="number" value={p.opex} onChange={(e) => update(i, { opex: Number(e.target.value) })} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Button type="submit" disabled={submitting || !hasRevenue}>
        {submitting ? 'Running…' : 'Run diagnostic'}
      </Button>
      {!hasRevenue && <p className="engine-form-hint">Enter revenue for at least one {periodLabel.toLowerCase()}.</p>}
    </form>
  );
}
