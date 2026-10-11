import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Kpi } from '../../../products/workspace/overview/overviewModel';

/** One KPI: a link to the tool behind the number, topped with its domain colour. */
export function StatTile({ kpi }: { kpi: Kpi }) {
  return (
    <Link className="ws-stat" to={kpi.to} data-domain={kpi.domain}>
      <span className="ws-stat-label">
        {kpi.label}
        <ArrowUpRight size={14} aria-hidden="true" />
      </span>
      <strong className="ws-stat-value" data-long={kpi.value.length > 5 || undefined}>
        {kpi.value}
      </strong>
      <small className="ws-stat-hint">{kpi.hint}</small>
    </Link>
  );
}
