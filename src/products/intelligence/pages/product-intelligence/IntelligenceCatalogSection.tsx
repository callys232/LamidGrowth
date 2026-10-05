import { useMemo } from 'react';
import { useEngineCatalog, type EngineSummary } from '../../../engines/hooks/useEngineCatalog';
import { EngineScope } from '../../../engines/components/EngineScope';
import { SkeletonCards } from '../../../../shared/ui/Skeleton';
import './intelligence-catalog.css';

const AREAS = [
  'Strategy',
  'Decisions',
  'Operations',
  'Risk',
  'Governance',
  'People',
  'Change',
  'Growth',
  'Finance',
] as const;

/** Public, logged-out, purely informational — no buttons, tabs, or forms. Public/audience pages
 * only educate; running a diagnostic is a signed-in workspace action (POST /api/engines/:code/run
 * requires a session — see src/app/engines.mjs), never available here. Every name/count/purpose
 * below is read live from the real registry (public GET /api/engines), not written or edited as
 * marketing copy — same "use the real thing, don't restate it" rule as the live price list on the
 * pricing page. */
export function IntelligenceCatalogSection() {
  const { catalog, error } = useEngineCatalog('/engines/catalog');

  const grouped = useMemo(() => {
    if (!catalog) return [];
    return AREAS.map((area) => {
      const inGroup: EngineSummary[] = catalog.engines.filter((e) => e.area === area);
      return { area, count: inGroup.length, engines: inGroup };
    }).filter((g) => g.count > 0);
  }, [catalog]);

  return (
    <section className="engine-catalog">
      <div className="engine-container">
        <div className="engine-catalog-head">
          <h2>63 Tools, Each Built on a Recognised Method.</h2>
          <p>
            Every tool follows an established method — ISO 31000 for risk, NIST CSF for security,
            OKRs, Theory of Constraints — and calculates from what you enter. No number is invented.
            Running one is a signed-in workspace action; this is the catalog.
          </p>
        </div>

        {error && <p className="engine-catalog-error">{error}</p>}
        {!catalog && <SkeletonCards count={6} />}

        {grouped.map(({ area, count, engines }) => (
          <div key={area} className="engine-catalog-group">
            <div className="engine-catalog-group-head">
              <h3>{area}</h3>
              <span>{count} tools</span>
            </div>
            <div className="engine-catalog-series">
              <ul>
                {engines.map((engine) => (
                  <li key={engine.code} className="engine-catalog-card">
                    <strong>{engine.engineName}</strong>
                    {engine.standard && (
                      <span className="engine-catalog-code">{engine.standard}</span>
                    )}
                    <p>{engine.purpose}</p>
                    <EngineScope computes={engine.computes} limits={engine.limits} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
