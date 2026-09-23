import { useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import { RowListForm, type Row, defaultRow, type FieldDef } from './RowListForm';
import './engine-forms.css';

const FIELDS: FieldDef[] = [
  { key: 'name', label: 'Option', type: 'text' },
  {
    key: 'probability',
    label: 'Probability of upside (0-100%)',
    type: 'number',
    min: 0,
    max: 100,
    default: 50,
  },
  { key: 'upside', label: 'Value if it succeeds', type: 'number', default: 0 },
  {
    key: 'downside',
    label: 'Loss if it fails (positive number)',
    type: 'number',
    min: 0,
    default: 0,
  },
  { key: 'cost', label: 'Cost', type: 'number', min: 0, default: 0 },
  { key: 'horizon', label: 'Months to outcome', type: 'number', min: 0, default: 6 },
];

/** Q05/Q24/Q59/Q60/Q61/Q69 — options compared on expected value, net of cost, with sensitivity
 * (how far a probability estimate could move before the ranking flips). */
export function ScenarioSimpleForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (input: { options: unknown[] }) => void;
  submitting: boolean;
}) {
  const [rows, setRows] = useState<Row[]>([defaultRow(FIELDS, 0), defaultRow(FIELDS, 1)]);

  return (
    <form
      className="engine-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          options: rows.map((r) => ({
            id: r.id,
            name: r.name,
            probability: Number(r.probability),
            upside: Number(r.upside),
            downside: Number(r.downside),
            cost: Number(r.cost),
            horizon: Number(r.horizon),
          })),
        });
      }}
    >
      <RowListForm
        fields={FIELDS}
        rows={rows}
        onChange={setRows}
        addLabel="Add option"
        minRows={2}
      />
      <Button type="submit" disabled={submitting || rows.length < 2}>
        {submitting ? 'Running…' : 'Run diagnostic'}
      </Button>
    </form>
  );
}
