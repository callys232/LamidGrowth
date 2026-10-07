import './engine-scope.css';

/** States, next to an engine's name and purpose, what it actually calculates and what it does
 * not. Names and purposes often promise more than the calculation behind them; this is the
 * honest counterweight, shown before anyone pays for a run. */
export function EngineScope({ computes, limits }: { computes?: string; limits?: string }) {
  if (!computes && !limits) return null;
  return (
    <dl className="engine-scope">
      {computes && (
        <div>
          <dt>What it calculates</dt>
          <dd>{computes}</dd>
        </div>
      )}
      {limits && (
        <div>
          <dt>What it does not do</dt>
          <dd>{limits}</dd>
        </div>
      )}
    </dl>
  );
}
