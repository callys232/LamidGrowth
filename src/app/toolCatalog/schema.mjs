/**
 * Schema-driven input for the standards-based tool catalog (see catalog.mjs).
 *
 * A tool declares its input as `fields` (single values) and `tables` (lists the user keeps, such
 * as a risk register or a decision log). The same declaration renders the form in the app
 * (SchemaForm.tsx) and validates the request here, so the form and the server cannot drift.
 * Validation refuses bad input with a message that names the row and column, before any points
 * are charged — the same contract as the original engine archetypes.
 *
 * Field types: number | percent | integer | text | longtext | select | date | boolean
 */

export class ToolInputError extends Error {
  constructor(msg) {
    super(msg);
    this.name = 'EngineInputError';
    this.status = 400;
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** True only for a real calendar day: Date.parse accepts 2026-02-31 and rolls it into March. */
const isCalendarDate = (s) => {
  const t = Date.parse(s);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s;
};

function coerce(field, raw, where) {
  // Text or numbers made only of spaces are as missing as an empty cell.
  const empty = raw === undefined || raw === null || (typeof raw === 'string' && !raw.trim());
  if (empty) {
    if (field.required) throw new ToolInputError(`${where}: “${field.label}” is required.`);
    return field.default ?? null;
  }
  switch (field.type) {
    case 'number':
    case 'percent':
    case 'integer': {
      const n = typeof raw === 'number' ? raw : Number(String(raw).replace(/,/g, ''));
      if (!Number.isFinite(n))
        throw new ToolInputError(`${where}: “${field.label}” must be a number.`);
      if (field.type === 'integer' && !Number.isInteger(n))
        throw new ToolInputError(`${where}: “${field.label}” must be a whole number.`);
      const min = field.min ?? (field.type === 'percent' ? 0 : undefined);
      const max = field.max ?? (field.type === 'percent' ? 100 : undefined);
      if (min !== undefined && n < min)
        throw new ToolInputError(`${where}: “${field.label}” must be at least ${min}.`);
      if (max !== undefined && n > max)
        throw new ToolInputError(`${where}: “${field.label}” must be at most ${max}.`);
      return n;
    }
    case 'boolean':
      return raw === true || raw === 'true' || raw === 'yes' || raw === 1 || raw === '1';
    case 'date': {
      const s = String(raw).slice(0, 10);
      if (!ISO_DATE.test(s) || !isCalendarDate(s))
        throw new ToolInputError(`${where}: “${field.label}” must be a date (YYYY-MM-DD).`);
      return s;
    }
    case 'select': {
      const values = field.options.map((o) => String(o.value));
      const s = String(raw);
      if (!values.includes(s))
        throw new ToolInputError(
          `${where}: “${field.label}” must be one of: ${field.options.map((o) => o.label).join(', ')}.`,
        );
      const opt = field.options.find((o) => String(o.value) === s);
      return typeof opt.value === 'number' ? opt.value : s;
    }
    case 'longtext':
      return String(raw).slice(0, 2000);
    default:
      return String(raw).trim().slice(0, 300);
  }
}

/** True when every cell in a table row is blank, so the form's spare empty rows are ignored. */
const isBlankRow = (row, columns) =>
  columns.every((c) => {
    const v = row?.[c.key];
    return v === undefined || v === null || v === '' || (c.type === 'boolean' && v === false);
  });

/** Validates `input` against a tool's schema and returns a clean, typed copy. */
export function parseSchemaInput(spec, input = {}) {
  const out = {};
  for (const field of spec.fields ?? []) {
    out[field.key] = coerce(field, input[field.key], 'Input');
  }
  for (const table of spec.tables ?? []) {
    const raw = Array.isArray(input[table.key]) ? input[table.key] : [];
    const rows = [];
    raw.forEach((row, i) => {
      if (isBlankRow(row, table.columns)) return;
      const clean = {};
      for (const col of table.columns) {
        clean[col.key] = coerce(col, row?.[col.key], `${table.label}, row ${i + 1}`);
      }
      rows.push(clean);
    });
    const min = table.minRows ?? 1;
    if (rows.length < min)
      throw new ToolInputError(
        `${table.label}: add at least ${min} ${min === 1 ? 'row' : 'rows'}${table.hint ? ` (${table.hint})` : ''}.`,
      );
    const max = table.maxRows ?? 200;
    if (rows.length > max) throw new ToolInputError(`${table.label}: at most ${max} rows.`);
    out[table.key] = rows;
  }
  return out;
}

/** Path of the first NaN or ±Infinity in a value, or null when every number is finite. */
function nonFinitePath(v, path = '') {
  if (typeof v === 'number') return Number.isFinite(v) ? null : path;
  if (!v || typeof v !== 'object') return null;
  for (const [k, x] of Object.entries(v)) {
    const p = nonFinitePath(x, `${path}.${k}`);
    if (p) return p;
  }
  return null;
}

/** Refuses a result holding NaN or ±Infinity. JSON would save those as null, which reads as
 * "no data" rather than as an error, and the run would still be charged. */
export function assertFinite(summary) {
  const bad = nonFinitePath(summary);
  if (bad)
    throw new ToolInputError(
      `These figures are too large or inconsistent to compute a result (${bad.slice(1) || 'result'}). Check the values entered.`,
    );
}

/* ── shared helpers for the compute functions ───────────────────────────── */
/** A dictionary keyed by user text. A plain `{}` would hand back Object.prototype members for
 * names like “constructor” or “toString”, and treat “__proto__” as its prototype. */
export const dict = () => Object.create(null);

export const r1 = (n) => Math.round(n * 10) / 10;
export const r2 = (n) => Math.round(n * 100) / 100;
export const sum = (xs) => xs.reduce((a, b) => a + b, 0);
export const mean = (xs) => (xs.length ? sum(xs) / xs.length : 0);
export const stdev = (xs) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(sum(xs.map((x) => (x - m) ** 2)) / (xs.length - 1));
};
export const median = (xs) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
export const percentile = (xs, p) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1));
  return s[idx];
};
export const pct = (part, whole) => (whole ? r1((part / whole) * 100) : 0);
const DAY = 86_400_000;
export const days = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / DAY);
export const today = () => new Date().toISOString().slice(0, 10);
export const money = (n) => (n < 0 ? '-' : '') + Math.abs(Math.round(n)).toLocaleString('en-GB');
export const list = (xs, max = 8) =>
  xs.length
    ? xs.slice(0, max).join('; ') + (xs.length > max ? `; and ${xs.length - max} more` : '')
    : 'none';

/** Shared shape every compute returns: the computed summary, the text the agent layer reads,
 * and warnings the app shows. `heading` names the tool and the method it follows. */
export function result(heading, summary, lines, warnings = []) {
  return { summary, working: [heading, ...lines.filter(Boolean)].join('\n'), warnings };
}

/* field builders keep the catalog declarations short */
export const F = {
  num: (key, label, o = {}) => ({ key, label, type: 'number', ...o }),
  int: (key, label, o = {}) => ({ key, label, type: 'integer', min: 0, ...o }),
  pct: (key, label, o = {}) => ({ key, label, type: 'percent', ...o }),
  text: (key, label, o = {}) => ({ key, label, type: 'text', ...o }),
  long: (key, label, o = {}) => ({ key, label, type: 'longtext', ...o }),
  date: (key, label, o = {}) => ({ key, label, type: 'date', ...o }),
  bool: (key, label, o = {}) => ({ key, label, type: 'boolean', ...o }),
  scale: (key, label, lo = 1, hi = 5, o = {}) => ({
    key,
    label,
    type: 'integer',
    min: lo,
    max: hi,
    ...o,
  }),
  select: (key, label, options, o = {}) => ({
    key,
    label,
    type: 'select',
    options: options.map((v) => (typeof v === 'object' ? v : { value: v, label: v })),
    ...o,
  }),
};
