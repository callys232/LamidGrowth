import { useMemo, useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import { RowListForm, type Row, defaultRow, type FieldDef } from './RowListForm';
import './engine-forms.css';

const CRITERIA_FIELDS: FieldDef[] = [
  { key: 'name', label: 'Criterion', type: 'text' },
  { key: 'weight', label: 'Relative weight', type: 'number', min: 1, default: 1 },
  {
    key: 'direction',
    label: 'Direction',
    type: 'select',
    options: [
      { value: 'higher_better', label: 'Higher is better' },
      { value: 'lower_better', label: 'Lower is better' },
    ],
    default: 'higher_better',
  },
];

/** Q21/Q35 — weighted multi-criteria selection with sensitivity analysis (how far a weight would
 * have to move before the ranking flips). Criterion names double as their ids in this form, so
 * each criterion needs a distinct name. */
export function SelectorForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (input: { options: unknown[]; criteria: unknown[] }) => void;
  submitting: boolean;
}) {
  const [criteria, setCriteria] = useState<Row[]>([defaultRow(CRITERIA_FIELDS, 0), defaultRow(CRITERIA_FIELDS, 1)]);
  const optionFields = useMemo<FieldDef[]>(
    () => [
      { key: 'name', label: 'Option', type: 'text' },
      ...criteria.map((c): FieldDef => ({ key: `score:${c.name}`, label: `Score — ${c.name || '(unnamed)'}`, type: 'number', default: 0 })),
    ],
    [criteria],
  );
  const [options, setOptions] = useState<Row[]>([defaultRow(optionFields, 0), defaultRow(optionFields, 1)]);

  return (
    <form
      className="engine-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          criteria: criteria.map((c) => ({ id: c.name, name: c.name, weight: Number(c.weight), direction: c.direction })),
          options: options.map((o) => ({
            id: o.name,
            name: o.name,
            scores: Object.fromEntries(criteria.map((c) => [c.name, Number(o[`score:${c.name}`] ?? 0)])),
          })),
        });
      }}
    >
      <h4>Criteria</h4>
      <RowListForm fields={CRITERIA_FIELDS} rows={criteria} onChange={setCriteria} addLabel="Add criterion" minRows={2} />
      <h4>Options</h4>
      <RowListForm fields={optionFields} rows={options} onChange={setOptions} addLabel="Add option" minRows={2} />
      <Button type="submit" disabled={submitting || criteria.length < 2 || options.length < 2}>
        {submitting ? 'Running…' : 'Run diagnostic'}
      </Button>
    </form>
  );
}
