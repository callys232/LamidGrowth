import type { EngineResult } from '../hooks/useEngineRun';
import { EngineScope } from './EngineScope';
import './engine-result.css';

/** Renders a computed EngineResult: the narrative summary every engine produces, its warnings,
 * and — for the 6 archetypes with a numeric `summary` object — the raw computed figures as a
 * plain key/value list. No bespoke chart per kind yet; the real numbers are always shown, just
 * not always visualised. */
const STATUS_NOTE: Record<string, string> = {
  provisional:
    'Provisional: too little was answered for a complete result. Only the parts answered are scored, and no points were charged.',
  insufficient_evidence:
    'Insufficient evidence: the inputs cannot support a conclusion yet, so none is drawn. No points were charged.',
};

export function EngineResultView({
  pointsCharged,
  balance,
  result,
  nextSteps,
}: {
  pointsCharged?: number;
  balance?: number;
  result: EngineResult;
  nextSteps?: string[];
}) {
  const flatFields = isPlainObject(result.summary)
    ? primitiveEntries(result.summary as Record<string, unknown>)
    : [];
  const tables = tablesOf(result.summary);

  return (
    <div className="engine-result">
      {pointsCharged !== undefined && balance !== undefined && (
        <div className="engine-result-meta">
          <span>{pointsCharged} points charged</span>
          <span>Balance: {balance}</span>
        </div>
      )}

      {result.standard && <p className="engine-result-standard">Method: {result.standard}</p>}

      {result.status && STATUS_NOTE[result.status] && (
        <div className="engine-result-status" role="status">
          <p>{STATUS_NOTE[result.status]}</p>
          {(nextSteps?.length ? nextSteps : (result.missingEvidence ?? [])).length > 0 && (
            <ul>
              {(nextSteps?.length ? nextSteps : (result.missingEvidence ?? []))
                .slice(0, 8)
                .map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
            </ul>
          )}
        </div>
      )}

      {result.warnings.length > 0 && (
        <ul className="engine-result-warnings">
          {result.warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}

      <pre className="engine-result-working">{result.working}</pre>

      <EngineScope computes={result.computes} limits={result.limits} />

      {flatFields.length > 0 && (
        <dl className="engine-result-fields">
          {flatFields.map(([key, value]) => (
            <div key={key}>
              <dt>{humanise(key)}</dt>
              <dd>{String(value)}</dd>
            </div>
          ))}
        </dl>
      )}

      {tables.map(([key, rows]) => (
        <div key={key} className="engine-result-table">
          <h4>{humanise(key)}</h4>
          <div className="engine-result-table-scroll">
            <table>
              <thead>
                <tr>
                  {columnsOf(rows).map((c) => (
                    <th key={c} scope="col">
                      {humanise(c)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((row, i) => (
                  <tr key={i}>
                    {columnsOf(rows).map((c) => (
                      <td key={c}>{cell(row[c])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Lists of records in the summary (ranked risks, teams, milestones…) shown as tables. */
function tablesOf(summary: unknown): [string, Record<string, unknown>[]][] {
  if (!isPlainObject(summary)) return [];
  return Object.entries(summary).filter(
    (e): e is [string, Record<string, unknown>[]] =>
      Array.isArray(e[1]) && e[1].length > 0 && e[1].every(isPlainObject),
  );
}

function columnsOf(rows: Record<string, unknown>[]): string[] {
  const cols: string[] = [];
  for (const r of rows.slice(0, 10))
    for (const [k, v] of Object.entries(r))
      if (
        !cols.includes(k) &&
        (v === null ||
          ['string', 'number', 'boolean'].includes(typeof v) ||
          (Array.isArray(v) && v.every((x) => typeof x !== 'object')))
      )
        cols.push(k);
  return cols.slice(0, 8);
}

function cell(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}

/** camelCase keys → readable labels ("weightSharePct" → "Weight share %"). */
function humanise(key: string): string {
  const words = key
    .replace(/Pct$/, ' %')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function primitiveEntries(obj: Record<string, unknown>): [string, unknown][] {
  return Object.entries(obj).filter(
    ([, v]) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean',
  );
}
