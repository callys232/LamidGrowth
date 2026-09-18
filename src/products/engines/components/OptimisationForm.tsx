import { useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import { RowListForm, type Row, defaultRow, type FieldDef } from './RowListForm';
import './engine-forms.css';

const FIELDS: FieldDef[] = [
  { key: 'name', label: 'Process step', type: 'text' },
  { key: 'capacity', label: 'Capacity per period', type: 'number', min: 0, default: 10 },
  { key: 'efficiencyPct', label: 'Efficiency (0-100%)', type: 'number', min: 0, max: 100, default: 90 },
  { key: 'cost', label: 'Cost per period (optional)', type: 'number', min: 0, default: 0 },
];

/** Constraint optimisation (P14, P21, F04) — finds the process step setting throughput
 * (theory of constraints), in order. */
export function OptimisationForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (input: { steps: unknown[] }) => void;
  submitting: boolean;
}) {
  const [rows, setRows] = useState<Row[]>([defaultRow(FIELDS, 0), defaultRow(FIELDS, 1)]);

  return (
    <form
      className="engine-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          steps: rows.map((r) => ({
            id: r.id, name: r.name, capacity: Number(r.capacity), efficiencyPct: Number(r.efficiencyPct),
            ...(Number(r.cost) > 0 ? { cost: Number(r.cost) } : {}),
          })),
        });
      }}
    >
      <RowListForm fields={FIELDS} rows={rows} onChange={setRows} addLabel="Add step" minRows={2} />
      <Button type="submit" disabled={submitting || rows.length < 2}>
        {submitting ? 'Running…' : 'Run diagnostic'}
      </Button>
    </form>
  );
}
