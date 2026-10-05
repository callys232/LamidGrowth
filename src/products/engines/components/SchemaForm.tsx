import { useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import type { SchemaField, SchemaTable } from '../hooks/useEngineRun';
import './engine-forms.css';
import './schema-form.css';

type Value = string | boolean;
type Row = Record<string, Value>;

const blank = (f: SchemaField): Value =>
  f.type === 'boolean'
    ? Boolean(f.default ?? false)
    : f.default === undefined
      ? ''
      : String(f.default);
const blankRow = (cols: SchemaField[]): Row =>
  Object.fromEntries(cols.map((c) => [c.key, blank(c)]));
const toValue = (v: unknown, f: SchemaField): Value =>
  f.type === 'boolean' ? Boolean(v) : v === undefined || v === null ? '' : String(v);

function initial(
  fields: SchemaField[],
  tables: SchemaTable[],
  from?: Record<string, unknown> | null,
) {
  const values: Row = Object.fromEntries(
    fields.map((f) => [f.key, from ? toValue(from[f.key], f) : blank(f)]),
  );
  const rows: Record<string, Row[]> = {};
  for (const t of tables) {
    const src =
      from && Array.isArray(from[t.key]) ? (from[t.key] as Record<string, unknown>[]) : null;
    rows[t.key] = src
      ? src.map((r) => Object.fromEntries(t.columns.map((c) => [c.key, toValue(r[c.key], c)])))
      : Array.from({ length: Math.max(1, t.minRows ?? 1) }, () => blankRow(t.columns));
  }
  return { values, rows };
}

function Input({
  field,
  value,
  onChange,
  id,
}: {
  field: SchemaField;
  value: Value;
  onChange: (v: Value) => void;
  id: string;
}) {
  if (field.type === 'boolean')
    return (
      <input
        id={id}
        type="checkbox"
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
      />
    );
  if (field.type === 'select')
    return (
      <select
        id={id}
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
      >
        <option value="">Choose…</option>
        {field.options?.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    );
  if (field.type === 'longtext')
    return (
      <textarea
        id={id}
        rows={3}
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
      />
    );
  const numeric = field.type === 'number' || field.type === 'percent' || field.type === 'integer';
  return (
    <input
      id={id}
      type={field.type === 'date' ? 'date' : numeric ? 'number' : 'text'}
      inputMode={numeric ? 'decimal' : undefined}
      step={field.type === 'integer' ? 1 : 'any'}
      min={field.min}
      max={field.max}
      value={String(value)}
      onChange={(e) => onChange(e.target.value)}
      required={field.required}
    />
  );
}

/** Renders any standards-catalog tool from its declared fields and tables. Values are sent as
 * typed in; the server (toolCatalog/schema.mjs) converts and validates them against the same
 * declaration and names the row and column of anything it refuses. */
export function SchemaForm({
  toolKey,
  fields,
  tables,
  example,
  onSubmit,
  submitting,
}: {
  toolKey: string;
  fields: SchemaField[];
  tables: SchemaTable[];
  example?: Record<string, unknown> | null;
  onSubmit: (input: Record<string, unknown>) => void;
  submitting: boolean;
}) {
  const [state, setState] = useState(() => initial(fields, tables));
  const [usingExample, setUsingExample] = useState(false);

  const setValue = (key: string, v: Value) =>
    setState((s) => ({ ...s, values: { ...s.values, [key]: v } }));
  const setCell = (table: string, i: number, key: string, v: Value) =>
    setState((s) => ({
      ...s,
      rows: {
        ...s.rows,
        [table]: s.rows[table].map((r, idx) => (idx === i ? { ...r, [key]: v } : r)),
      },
    }));
  const addRow = (t: SchemaTable) =>
    setState((s) => ({
      ...s,
      rows: { ...s.rows, [t.key]: [...s.rows[t.key], blankRow(t.columns)] },
    }));
  const removeRow = (table: string, i: number) =>
    setState((s) => ({
      ...s,
      rows: { ...s.rows, [table]: s.rows[table].filter((_, idx) => idx !== i) },
    }));

  return (
    <form
      className="engine-form schema-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ ...state.values, ...state.rows });
      }}
    >
      {example && (
        <div className="schema-form-example">
          {usingExample ? (
            <span>
              Example figures loaded. Replace them with your own before relying on the result.
            </span>
          ) : (
            <span>Not sure what to enter? Load a worked example to see how the tool works.</span>
          )}
          <Button
            variant="secondary"
            onClick={() => {
              setState(usingExample ? initial(fields, tables) : initial(fields, tables, example));
              setUsingExample(!usingExample);
            }}
          >
            {usingExample ? 'Clear example' : 'Load an example'}
          </Button>
        </div>
      )}

      {fields.length > 0 && (
        <fieldset className="engine-form-row schema-form-fields">
          {fields.map((f) => (
            <label
              key={f.key}
              htmlFor={`${toolKey}-${f.key}`}
              className={f.type === 'longtext' ? 'schema-wide' : undefined}
            >
              {f.label}
              {f.required && <span className="schema-required"> *</span>}
              <Input
                id={`${toolKey}-${f.key}`}
                field={f}
                value={state.values[f.key]}
                onChange={(v) => setValue(f.key, v)}
              />
            </label>
          ))}
        </fieldset>
      )}

      {tables.map((t) => (
        <section key={t.key} className="schema-table">
          <h4>
            {t.label}
            {t.hint && <small> — {t.hint}</small>}
          </h4>
          <div className="schema-table-scroll">
            <table className="engine-form-grid">
              <thead>
                <tr>
                  {t.columns.map((c) => (
                    <th key={c.key} scope="col">
                      {c.label}
                      {c.required && <span className="schema-required"> *</span>}
                    </th>
                  ))}
                  <th aria-label="Remove row" />
                </tr>
              </thead>
              <tbody>
                {state.rows[t.key].map((row, i) => (
                  <tr key={i}>
                    {t.columns.map((c) => (
                      <td key={c.key}>
                        <Input
                          id={`${toolKey}-${t.key}-${i}-${c.key}`}
                          field={{ ...c, required: false }}
                          value={row[c.key]}
                          onChange={(v) => setCell(t.key, i, c.key, v)}
                        />
                      </td>
                    ))}
                    <td>
                      {state.rows[t.key].length > (t.minRows ?? 1) && (
                        <button
                          type="button"
                          className="row-list-remove"
                          onClick={() => removeRow(t.key, i)}
                          aria-label={`Remove row ${i + 1}`}
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {state.rows[t.key].length < (t.maxRows ?? 200) && (
            <Button variant="secondary" onClick={() => addRow(t)}>
              Add row
            </Button>
          )}
        </section>
      ))}

      <Button type="submit" disabled={submitting}>
        {submitting ? 'Running…' : 'Run'}
      </Button>
      <p className="engine-form-hint">Fields marked * are required. Empty rows are ignored.</p>
    </form>
  );
}
