import { useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import { RowListForm, type Row, defaultRow, type FieldDef } from './RowListForm';
import './engine-forms.css';

const FIELDS: FieldDef[] = [
  { key: 'name', label: 'Initiative', type: 'text' },
  { key: 'value', label: 'Value (0-5)', type: 'number', min: 0, max: 5, default: 3 },
  { key: 'effort', label: 'Effort (points/FTE-months)', type: 'number', min: 0, default: 2 },
  { key: 'mandatory', label: 'Mandatory (cannot be deferred)', type: 'checkbox' },
];

/** Roadmap sequencing (C06, G04, G07, Q31, Q56, A03, A26) — initiatives sequenced into a phased
 * schedule under a per-period capacity constraint. Dependencies between initiatives aren't
 * captured in this cut of the form; add them as separate rows and sequence manually if needed. */
export function RoadmapForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (input: {
    initiatives: unknown[];
    periods: number;
    capacityPerPeriod: number;
    periodLabel: string;
  }) => void;
  submitting: boolean;
}) {
  const [rows, setRows] = useState<Row[]>([defaultRow(FIELDS, 0)]);
  const [periods, setPeriods] = useState(4);
  const [capacityPerPeriod, setCapacityPerPeriod] = useState(10);
  const [periodLabel, setPeriodLabel] = useState('Quarter');

  return (
    <form
      className="engine-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          initiatives: rows.map((r) => ({
            id: r.id,
            name: r.name,
            value: Number(r.value),
            effort: Number(r.effort),
            mandatory: Boolean(r.mandatory),
          })),
          periods,
          capacityPerPeriod,
          periodLabel,
        });
      }}
    >
      <div className="engine-form-row engine-form-row-inline">
        <label>
          Period label
          <input type="text" value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} />
        </label>
        <label>
          Number of periods
          <input
            type="number"
            min={1}
            value={periods}
            onChange={(e) => setPeriods(Number(e.target.value))}
          />
        </label>
        <label>
          Capacity per period
          <input
            type="number"
            min={1}
            value={capacityPerPeriod}
            onChange={(e) => setCapacityPerPeriod(Number(e.target.value))}
          />
        </label>
      </div>
      <RowListForm fields={FIELDS} rows={rows} onChange={setRows} addLabel="Add initiative" />
      <Button type="submit" disabled={submitting || rows.length === 0}>
        {submitting ? 'Running…' : 'Run diagnostic'}
      </Button>
    </form>
  );
}
