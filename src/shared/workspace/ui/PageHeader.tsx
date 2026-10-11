import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import type { Kpi } from '../../../products/workspace/overview/overviewModel';
import { sourcePage } from '../../content/sourcePage';
import { Eyebrow } from '../../ui/Eyebrow';
import { StatTile } from './StatTile';

/** A workspace page's header: eyebrow, title, description, actions and an optional KPI strip.
 * Canonical page copy (content/catalog) overrides the title and description, as in PageHeading. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  kpis,
  loadingKpis = 0,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  kpis?: Kpi[];
  /** Number of placeholder tiles to show while the KPIs load. */
  loadingKpis?: number;
}) {
  const source = sourcePage(useLocation().pathname);
  return (
    <header className="ws-page-header">
      <div className="ws-page-header-top">
        <div className="ws-page-header-copy">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1>{source?.title || title}</h1>
          <p>{source?.description || description}</p>
        </div>
        {actions && <div className="ws-page-header-actions">{actions}</div>}
      </div>
      {kpis && kpis.length > 0 ? (
        <div className="ws-kpis">
          {kpis.map((kpi) => (
            <StatTile kpi={kpi} key={kpi.label} />
          ))}
        </div>
      ) : loadingKpis > 0 ? (
        <div className="ws-kpis" aria-busy="true" aria-label="Loading figures">
          {Array.from({ length: loadingKpis }, (_, index) => (
            <span className="ws-stat-skeleton" key={index} />
          ))}
        </div>
      ) : null}
    </header>
  );
}
