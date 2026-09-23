import type { EngineResult } from '../hooks/useEngineRun';
import './engine-result.css';

/** Renders a computed EngineResult: the narrative summary every engine produces, its warnings,
 * and — for the 6 archetypes with a numeric `summary` object — the raw computed figures as a
 * plain key/value list. No bespoke chart per kind yet; the real numbers are always shown, just
 * not always visualised. */
export function EngineResultView({
  pointsCharged,
  balance,
  result,
}: {
  pointsCharged?: number;
  balance?: number;
  result: EngineResult;
}) {
  const flatFields = isPlainObject(result.summary)
    ? primitiveEntries(result.summary as Record<string, unknown>)
    : [];

  return (
    <div className="engine-result">
      {pointsCharged !== undefined && balance !== undefined && (
        <div className="engine-result-meta">
          <span>{pointsCharged} points charged</span>
          <span>Balance: {balance}</span>
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

      {flatFields.length > 0 && (
        <dl className="engine-result-fields">
          {flatFields.map(([key, value]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{String(value)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function primitiveEntries(obj: Record<string, unknown>): [string, unknown][] {
  return Object.entries(obj).filter(
    ([, v]) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean',
  );
}
