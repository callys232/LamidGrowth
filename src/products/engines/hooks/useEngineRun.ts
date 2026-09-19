import { useEffect, useState, useCallback } from 'react';
import { api } from '../../../api';
import type { EngineKind } from './useEngineCatalog';

export type SeriesMetric = {
  key: string;
  label: string;
  unit: string;
  hint?: string;
  sample?: number[];
  betterWhen: 'higher' | 'lower';
  target?: number;
};

export type EngineInputSpec =
  | { kind: 'timeseries'; periodLabel: string; periods: number; metrics: SeriesMetric[] }
  | { kind: 'financial'; periodLabel: string; periods: number }
  | { kind: Exclude<EngineKind, 'timeseries' | 'financial'> };

export type DecisionQualityQuestion = {
  id: string;
  requirement: string;
  prompt: string;
  options: { value: number; label: string }[];
  remedy: string;
  fatalAtZero?: boolean;
};
export type DecisionQualityRequirement = { id: string; label: string; what: string };

export type EngineDetail = {
  code: string;
  homeEngine: string;
  seriesName: string;
  engineName: string;
  purpose: string;
  dimensionLabels: string[];
  driverContext: string;
  correctionProtocols: string[];
  inputs: EngineInputSpec;
  pointsCost: number;
  decisionQuality?: { requirements: DecisionQualityRequirement[]; questions: DecisionQualityQuestion[] };
};

export type EngineResult = {
  code: string;
  homeEngine: string;
  engineName: string;
  seriesName: string;
  kind: EngineKind;
  summary: unknown;
  working: string;
  warnings: string[];
};

export type EngineRunResponse = { runId?: string; pointsCharged?: number; balance?: number; result: EngineResult };

/** Loads one engine's manifest (for form rendering) and exposes a run() call.
 * `demo=false` (default) — authenticated, charges points, persists a run: POST /engines/:code/run.
 * `demo=true` — public, no session/charge/persistence, same real compute: POST
 * /engines/:code/demo-run, used only by the public /demo page. See server: src/app/engines.mjs. */
export function useEngineRun(code: string | null, demo = false) {
  const [manifest, setManifest] = useState<EngineDetail | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<EngineRunResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setManifest(null);
    setResult(null);
    setError('');
    if (!code) return;
    api<EngineDetail>(`/engines/${code}`, undefined, 'GET')
      .then(setManifest)
      .catch((e) => setError((e as Error).message));
  }, [code]);

  const run = useCallback(
    async (input: Record<string, unknown>) => {
      if (!code) return;
      setRunning(true);
      setError('');
      try {
        const response = await api<EngineRunResponse>(`/engines/${code}/${demo ? 'demo-run' : 'run'}`, { input }, 'POST');
        setResult(response);
        return response;
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        setRunning(false);
      }
    },
    [code, demo],
  );

  return { manifest, running, result, error, run };
}
