import { useEffect, useState } from 'react';
import { api } from '../../../api';

export type EngineKind =
  | 'decision-quality'
  | 'growth-pathways'
  | 'bench-strength'
  | 'scenario-decision'
  | 'roadmap'
  | 'optimisation'
  | 'selection'
  | 'conflict'
  | 'assessment'
  | 'financial'
  | 'roster'
  | 'scenario'
  | 'timeseries'
  | 'narrative'
  | 'schema'
  | 'anchored';

export type EngineSummary = {
  code: string;
  toolId?: string;
  /** Subject area: Strategy, Decisions, Operations, Risk, Governance, People, Change, Growth, Finance. */
  area?: string;
  /** The recognised method the tool follows. */
  standard?: string;
  homeEngine: string;
  seriesName: string;
  engineName: string;
  purpose: string;
  dimensionLabels: string[];
  kind: EngineKind;
  /** What the engine actually calculates, and what it does not — see describeEngine on the server. */
  computes: string;
  limits: string;
  pointsCost: number;
};

export type EngineCatalog = { engines: EngineSummary[]; count: number; locked?: EngineSummary[] };

/** Two different catalogs share this shape (see server: src/app/engines.mjs,
 * src/app/engineRegistry.mjs):
 *  - `/engines` (default) — authenticated, filtered to what the signed-in workspace's context/
 *    tier/bundles actually grant. Used by the in-app /os/engines page.
 *  - `/engines/catalog` — public, always the full 63-tool list, for marketing/education pages
 *    ("a user only learns of all the tools from the public-facing pages"). Pass this explicitly
 *    from a logged-out page — see IntelligenceCatalogSection.tsx. */
export function useEngineCatalog(path: '/engines' | '/engines/catalog' = '/engines') {
  const [catalog, setCatalog] = useState<EngineCatalog | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<EngineCatalog>(path, undefined, 'GET')
      .then(setCatalog)
      .catch((e) => setError((e as Error).message));
  }, [path]);

  return { catalog, error };
}
