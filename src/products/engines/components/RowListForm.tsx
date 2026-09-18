import { Button } from '../../../shared/ui/Button';
import './engine-forms.css';
import './row-list-form.css';

export type FieldDef =
  | { key: string; label: string; type: 'text'; default?: string }
  | { key: string; label: string; type: 'number'; min?: number; max?: number; step?: number; default?: number }
  | { key: string; label: string; type: 'select'; options: { value: string; label: string }[]; default?: string }
  | { key: string; label: string; type: 'checkbox'; default?: boolean };

export type Row = Record<string, string | number | boolean>;

function defaultRow(fields: FieldDef[], index: number): Row {
  const row: Row = { id: `row-${index}-${Date.now()}` };
  for (const f of fields) {
    if (f.type === 'number') row[f.key] = f.default ?? 0;
    else if (f.type === 'checkbox') row[f.key] = f.default ?? false;
    else if (f.type === 'select') row[f.key] = f.default ?? f.options[0]?.value ?? '';
    else row[f.key] = f.default ?? '';
  }
  return row;
}

/** Generic "add a row of typed fields" editor shared by every bespoke engine kind whose input is
 * a user-defined list (pathways, roles, initiatives, steps, options, criteria, objectives…) — see
 * the field configs in each Xxx Form.tsx wrapper for the shape each kind actually expects. */
export function RowListForm({
  fields,
  rows,
  onChange,
  addLabel = 'Add row',
  minRows = 1,
}: {
  fields: FieldDef[];
  rows: Row[];
  onChange: (rows: Row[]) => void;
  addLabel?: string;
  minRows?: number;
}) {
  function update(i: number, key: string, value: string | number | boolean) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  }
  function add() {
    onChange([...rows, defaultRow(fields, rows.length)]);
  }
  function remove(i: number) {
    onChange(rows.filter((_, idx) => idx !== i));
  }

  return (
    <div className="row-list-form">
      {rows.map((row, i) => (
        <fieldset key={String(row.id)} className="engine-form-row row-list-item">
          <div className="row-list-fields">
            {fields.map((f) => (
              <label key={f.key}>
                {f.label}
                {f.type === 'select' ? (
                  <select value={String(row[f.key] ?? '')} onChange={(e) => update(i, f.key, e.target.value)}>
                    {f.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : f.type === 'checkbox' ? (
                  <input type="checkbox" checked={Boolean(row[f.key])} onChange={(e) => update(i, f.key, e.target.checked)} />
                ) : f.type === 'number' ? (
                  <input
                    type="number"
                    min={f.min}
                    max={f.max}
                    step={f.step ?? 1}
                    value={Number(row[f.key] ?? 0)}
                    onChange={(e) => update(i, f.key, Number(e.target.value))}
                  />
                ) : (
                  <input type="text" value={String(row[f.key] ?? '')} onChange={(e) => update(i, f.key, e.target.value)} />
                )}
              </label>
            ))}
          </div>
          {rows.length > minRows && (
            <button type="button" className="row-list-remove" onClick={() => remove(i)}>
              Remove
            </button>
          )}
        </fieldset>
      ))}
      <Button variant="secondary" onClick={add}>
        {addLabel}
      </Button>
    </div>
  );
}

export { defaultRow };
