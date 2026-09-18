import { useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import { RowListForm, type Row, defaultRow, type FieldDef } from './RowListForm';
import './engine-forms.css';

const FIELDS: FieldDef[] = [
  { key: 'name', label: 'Objective', type: 'text' },
  { key: 'priority', label: 'Priority (1-5)', type: 'number', min: 1, max: 5, default: 3 },
  { key: 'metric', label: 'Metric it moves (optional)', type: 'text' },
  {
    key: 'direction',
    label: 'Direction',
    type: 'select',
    options: [
      { value: 'increases', label: 'Increases the metric' },
      { value: 'decreases', label: 'Decreases the metric' },
    ],
    default: 'increases',
  },
  { key: 'magnitude', label: 'Magnitude (1-5)', type: 'number', min: 1, max: 5, default: 3 },
];

/** Q06 — objectives checked pairwise for directional contradiction. One metric-effect per
 * objective in this cut of the form; leave "Metric" blank to skip pairwise checking for a row. */
export function ConflictForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (input: { objectives: unknown[] }) => void;
  submitting: boolean;
}) {
  const [rows, setRows] = useState<Row[]>([defaultRow(FIELDS, 0), defaultRow(FIELDS, 1)]);

  return (
    <form
      className="engine-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          objectives: rows.map((r) => ({
            id: r.id,
            name: r.name,
            priority: Number(r.priority),
            effects: r.metric
              ? [{ metric: r.metric, direction: r.direction, magnitude: Number(r.magnitude) }]
              : [],
          })),
        });
      }}
    >
      <RowListForm fields={FIELDS} rows={rows} onChange={setRows} addLabel="Add objective" minRows={2} />
      <Button type="submit" disabled={submitting || rows.length < 2}>
        {submitting ? 'Running…' : 'Run diagnostic'}
      </Button>
    </form>
  );
}
