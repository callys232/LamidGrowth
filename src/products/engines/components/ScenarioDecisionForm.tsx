import { useMemo, useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import { RowListForm, type Row, defaultRow, type FieldDef } from './RowListForm';
import './engine-forms.css';

const SCENARIO_FIELDS: FieldDef[] = [
  { key: 'name', label: 'Scenario', type: 'text' },
  {
    key: 'probability',
    label: 'Probability (%, should sum to ~100)',
    type: 'number',
    min: 0,
    max: 100,
    default: 50,
  },
];

/** Q03/Q46/Q47/Q68 — options evaluated across possible futures under three decision rules
 * (expected value, minimax regret, maximin), with EVPI. Scenario names double as their ids, so
 * each scenario needs a distinct name. */
export function ScenarioDecisionForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (input: { scenarios: unknown[]; options: unknown[] }) => void;
  submitting: boolean;
}) {
  const [scenarios, setScenarios] = useState<Row[]>([
    defaultRow(SCENARIO_FIELDS, 0),
    defaultRow(SCENARIO_FIELDS, 1),
  ]);
  const optionFields = useMemo<FieldDef[]>(
    () => [
      { key: 'name', label: 'Option', type: 'text' },
      ...scenarios.map((s): FieldDef => ({
        key: `payoff:${s.name}`,
        label: `Payoff — ${s.name || '(unnamed)'}`,
        type: 'number',
        default: 0,
      })),
    ],
    [scenarios],
  );
  const [options, setOptions] = useState<Row[]>([
    defaultRow(optionFields, 0),
    defaultRow(optionFields, 1),
  ]);

  return (
    <form
      className="engine-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          scenarios: scenarios.map((s) => ({
            id: s.name,
            name: s.name,
            probability: Number(s.probability),
          })),
          options: options.map((o) => ({
            id: o.name,
            name: o.name,
            payoffs: Object.fromEntries(
              scenarios.map((s) => [s.name, Number(o[`payoff:${s.name}`] ?? 0)]),
            ),
          })),
        });
      }}
    >
      <h4>Scenarios</h4>
      <RowListForm
        fields={SCENARIO_FIELDS}
        rows={scenarios}
        onChange={setScenarios}
        addLabel="Add scenario"
        minRows={2}
      />
      <h4>Options</h4>
      <RowListForm
        fields={optionFields}
        rows={options}
        onChange={setOptions}
        addLabel="Add option"
        minRows={2}
      />
      <Button type="submit" disabled={submitting || scenarios.length < 2 || options.length < 2}>
        {submitting ? 'Running…' : 'Run diagnostic'}
      </Button>
    </form>
  );
}
