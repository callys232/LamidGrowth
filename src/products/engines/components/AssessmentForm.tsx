import { useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import './engine-forms.css';

type Row = { label: string; rating: number; weight: number; evidence: number; note?: string };

/** Renders the module's own declared dimensions (not a generic questionnaire) — the
 * engine supplies the questions, the caller supplies ratings. Matches the server's
 * alignToDimensions() in src/app/engines.mjs, which refuses any label it did not declare. */
export function AssessmentForm({
  dimensionLabels,
  onSubmit,
  submitting,
}: {
  dimensionLabels: string[];
  onSubmit: (input: { rows: Row[] }) => void;
  submitting: boolean;
}) {
  const [rows, setRows] = useState<Row[]>(
    dimensionLabels.map((label) => ({ label, rating: 0, weight: 2, evidence: 0 })),
  );

  function update(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  const hasRating = rows.some((r) => r.rating > 0);

  return (
    <form
      className="engine-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ rows });
      }}
    >
      {rows.map((row, i) => (
        <fieldset key={row.label} className="engine-form-row">
          <legend>{row.label}</legend>
          <label>
            Rating (0–5)
            <input
              type="range"
              min={0}
              max={5}
              step={1}
              value={row.rating}
              onChange={(e) => update(i, { rating: Number(e.target.value) })}
            />
            <span className="engine-form-value">{row.rating}</span>
          </label>
          <label>
            Weight (1–3)
            <select
              value={row.weight}
              onChange={(e) => update(i, { weight: Number(e.target.value) })}
            >
              <option value={1}>1 — minor</option>
              <option value={2}>2 — standard</option>
              <option value={3}>3 — critical</option>
            </select>
          </label>
          <label>
            Evidence (0–2)
            <select
              value={row.evidence}
              onChange={(e) => update(i, { evidence: Number(e.target.value) })}
            >
              <option value={0}>0 — none / opinion only</option>
              <option value={1}>1 — some documented evidence</option>
              <option value={2}>2 — well documented</option>
            </select>
          </label>
          <label>
            Note (optional)
            <input
              type="text"
              maxLength={400}
              value={row.note ?? ''}
              onChange={(e) => update(i, { note: e.target.value })}
            />
          </label>
        </fieldset>
      ))}
      <Button type="submit" disabled={submitting || !hasRating}>
        {submitting ? 'Running…' : 'Run diagnostic'}
      </Button>
      {!hasRating && <p className="engine-form-hint">Rate at least one dimension above zero.</p>}
    </form>
  );
}
