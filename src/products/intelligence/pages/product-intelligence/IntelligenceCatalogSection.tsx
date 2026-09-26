import { useMemo } from 'react';
import { useEngineCatalog, type EngineSummary } from '../../../engines/hooks/useEngineCatalog';
import { SkeletonCards } from '../../../../shared/ui/Skeleton';
import './intelligence-catalog.css';

const HOME_ENGINES = [
  'Clarity',
  'Capability',
  'Consistency',
  'Growth',
  'Finance',
  'Shared',
] as const;

/** Public, logged-out, purely informational — no buttons, tabs, or forms. Public/audience pages
 * only educate; running a diagnostic is a signed-in workspace action (POST /api/engines/:code/run
 * requires a session — see src/app/engines.mjs), never available here. Every name/count/purpose
 * below is read live from the real registry (public GET /api/engines), not written or edited as
 * marketing copy — same "use the real thing, don't restate it" rule as BillablesSection on the
 * pricing page. */
export function IntelligenceCatalogSection() {
  const { catalog, error } = useEngineCatalog('/engines/catalog');

  const grouped = useMemo(() => {
    if (!catalog) return [];
    return HOME_ENGINES.map((homeEngine) => {
      const inGroup = catalog.engines.filter((e) => e.homeEngine === homeEngine);
      const bySeries = new Map<string, EngineSummary[]>();
      for (const engine of inGroup) {
        const list = bySeries.get(engine.seriesName) ?? [];
        list.push(engine);
        bySeries.set(engine.seriesName, list);
      }
      return { homeEngine, count: inGroup.length, series: [...bySeries.entries()] };
    }).filter((g) => g.count > 0);
  }, [catalog]);

  return (
    <section className="engine-catalog">
      <div className="engine-container">
        <div className="engine-catalog-head">
          <h2>248 Diagnostic Engines. Real Arithmetic, Not Guessed Scores.</h2>
          <p>
            Every module computes from what you enter — margins, coverage, sequencing, sensitivity —
            the model never invents a number. Running one is a signed-in workspace action; this is
            the catalog.
          </p>
        </div>

        {error && <p className="engine-catalog-error">{error}</p>}
        {!catalog && <SkeletonCards count={6} />}

        {grouped.map(({ homeEngine, count, series }) => (
          <div key={homeEngine} className="engine-catalog-group">
            <div className="engine-catalog-group-head">
              <h3>{homeEngine}</h3>
              <span>{count} engines</span>
            </div>
            {series.map(([seriesName, engines]) => (
              <div key={seriesName} className="engine-catalog-series">
                <h4>{seriesName}</h4>
                <ul>
                  {engines.map((engine) => (
                    <li key={engine.code} className="engine-catalog-card">
                      <span className="engine-catalog-code">{engine.code}</span>
                      <strong>{engine.engineName}</strong>
                      <p>{engine.purpose}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
