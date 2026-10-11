import { breakdownRows } from './matchModel';

/** Each part of a match score as a labelled bar against its maximum. */
export function Breakdown({ breakdown }: { breakdown: Record<string, number> }) {
  return (
    <ul className="ws-breakdown">
      {breakdownRows(breakdown).map((row) => (
        <li key={row.key}>
          <span>{row.label}</span>
          <span className="ws-breakdown-bar" aria-hidden="true">
            <i style={{ width: `${(row.value / row.max) * 100}%` }} />
          </span>
          <strong>
            {row.value}
            <small>/{row.max}</small>
          </strong>
        </li>
      ))}
    </ul>
  );
}
