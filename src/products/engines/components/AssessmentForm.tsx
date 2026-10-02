import { useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import './engine-forms.css';

/** `rating: null` means "not rated" — the server leaves it out of the score and reports it as a
 * coverage gap, instead of treating an untouched control as a rating of 0. */
type Row = { label: string; rating: number | null; weight: number; evidence: number; note?: string };

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
    dimensionLabels.map((label) => ({ label, rating: null, weight: 2, evidence: 0 })),
  );

  function update(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  const hasRating = rows.some((r) => r.rating !== null);

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
            <select
              value={row.rating === null ? '' : String(row.rating)}
              onChange={(e) =>
                update(i, { rating: e.target.value === '' ? null : Number(e.target.value) })
              }
            >
              <option value="">Not rated</option>
              <option value={0}>0 — not true at all</option>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5 — consistently true across the organisation</option>
            </select>
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
      {!hasRating && (
        <p className="engine-form-hint">
          Rate at least one dimension. Dimensions you leave unrated are reported as not assessed,
          not scored as zero.
        </p>
      )}
    </form>
  );
}
