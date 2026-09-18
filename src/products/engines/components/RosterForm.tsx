import { useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import { RowListForm, type Row, defaultRow, type FieldDef } from './RowListForm';
import './engine-forms.css';

const FIELDS: FieldDef[] = [
  { key: 'role', label: 'Role', type: 'text' },
  { key: 'headcount', label: 'Headcount', type: 'number', min: 0, default: 1 },
  { key: 'capability', label: 'Avg. capability (1-5)', type: 'number', min: 1, max: 5, default: 3 },
  { key: 'attritionRisk', label: 'Attrition risk (1-5)', type: 'number', min: 1, max: 5, default: 2 },
  { key: 'successors', label: 'Ready successors', type: 'number', min: 0, default: 0 },
  { key: 'critical', label: 'Critical role', type: 'checkbox' },
];

/** A-series workforce-structure modules (A02-A06, A21, A22, A24-A26, A28, A30-A31) — capability
 * and succession, computed from your actual roster rather than self-rated abstractions. */
export function RosterForm({
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
            id: r.id, role: r.role, headcount: Number(r.headcount), capability: Number(r.capability),
            attritionRisk: Number(r.attritionRisk), successors: Number(r.successors), critical: Boolean(r.critical),
          })),
        });
      }}
    >
      <RowListForm fields={FIELDS} rows={rows} onChange={setRows} addLabel="Add role" />
      <Button type="submit" disabled={submitting || rows.length === 0}>
        {submitting ? 'Running…' : 'Run diagnostic'}
      </Button>
    </form>
  );
}
