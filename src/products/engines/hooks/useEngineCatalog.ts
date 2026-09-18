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
  | 'narrative';

export type EngineSummary = {
  code: string;
  homeEngine: string;
  seriesName: string;
  engineName: string;
  purpose: string;
  dimensionLabels: string[];
  kind: EngineKind;
  pointsCost: number;
};

export type EngineCatalog = { engines: EngineSummary[]; count: number };

/** /os/engines — the ported intelligence-engine catalog (see server: src/app/engines.mjs,
 * src/app/engineRegistry.mjs). One list call covers all 248 diagnostic tools; the frontend
 * groups/filters by `homeEngine` rather than requesting per-suite. */
export function useEngineCatalog() {
  const [catalog, setCatalog] = useState<EngineCatalog | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<EngineCatalog>('/engines', undefined, 'GET')
      .then(setCatalog)
      .catch((e) => setError((e as Error).message));
  }, []);

  return { catalog, error };
}
