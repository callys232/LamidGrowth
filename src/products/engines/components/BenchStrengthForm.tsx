import { useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import { RowListForm, type Row, defaultRow, type FieldDef } from './RowListForm';
import './engine-forms.css';

const FIELDS: FieldDef[] = [
  { key: 'title', label: 'Seat / role title', type: 'text' },
  { key: 'criticality', label: 'Criticality (1-5)', type: 'number', min: 1, max: 5, default: 3 },
  {
    key: 'incumbentFlightRisk',
    label: 'Incumbent flight risk',
    type: 'select',
    options: [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'leaving', label: 'Leaving' },
    ],
    default: 'low',
  },
  { key: 'noticeMonths', label: 'Realistic notice (months)', type: 'number', min: 0, default: 3 },
  { key: 'successorName', label: 'Named successor (blank = none)', type: 'text' },
  {
    key: 'successorReadiness',
    label: 'Successor readiness',
    type: 'select',
    options: [
      { value: 'now', label: 'Ready now' },
      { value: '12m', label: 'Ready in 12 months' },
      { value: '24m', label: 'Ready in 24 months' },
      { value: 'development', label: 'In development, no timeline' },
    ],
    default: 'now',
  },
];

/** A22 — succession coverage per seat. One named successor per seat in this cut of the form
 * (the engine accepts several per seat; add more roles as separate rows if a seat has multiple
 * successors you want to track). */
export function BenchStrengthForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (input: { roles: unknown[] }) => void;
  submitting: boolean;
}) {
  const [rows, setRows] = useState<Row[]>([defaultRow(FIELDS, 0)]);

  return (
    <form
      className="engine-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          roles: rows.map((r) => ({
            id: r.id,
            title: r.title,
            criticality: Number(r.criticality),
            incumbentFlightRisk: r.incumbentFlightRisk,
            noticeMonths: Number(r.noticeMonths),
            successors: r.successorName
              ? [{ person: r.successorName, readiness: r.successorReadiness }]
              : [],
          })),
        });
      }}
    >
      <RowListForm fields={FIELDS} rows={rows} onChange={setRows} addLabel="Add seat" />
      <Button type="submit" disabled={submitting || rows.length === 0}>
        {submitting ? 'Running…' : 'Run diagnostic'}
      </Button>
    </form>
  );
}
