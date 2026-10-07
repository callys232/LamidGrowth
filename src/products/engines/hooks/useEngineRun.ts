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

/** A typed input the standards-based catalog tools declare (src/app/toolCatalog/schema.mjs). The
 * server validates against the same declaration, so the form and the server cannot drift. */
export type SchemaField = {
  key: string;
  label: string;
  type: 'number' | 'percent' | 'integer' | 'text' | 'longtext' | 'select' | 'date' | 'boolean';
  required?: boolean;
  min?: number;
  max?: number;
  default?: string | number | boolean;
  options?: { value: string | number; label: string }[];
};
export type SchemaTable = {
  key: string;
  label: string;
  hint?: string;
  minRows?: number;
  maxRows?: number;
  columns: SchemaField[];
};
export type AnchoredQuestion = { id: string; text: string; low: string; high: string };
export type AnchoredSection = { id: string; label: string; questions: AnchoredQuestion[] };

export type EngineInputSpec =
  | { kind: 'timeseries'; periodLabel: string; periods: number; metrics: SeriesMetric[] }
  | { kind: 'financial'; periodLabel: string; periods: number }
  | { kind: 'schema'; fields: SchemaField[]; tables: SchemaTable[] }
  | {
      kind: 'anchored';
      levels: { value: number; label: string }[];
      evidence: { value: number; label: string }[];
      sections: AnchoredSection[];
    }
  | { kind: Exclude<EngineKind, 'timeseries' | 'financial' | 'schema' | 'anchored'> };

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
  toolId?: string;
  area?: string;
  /** The recognised method the tool follows. */
  standard?: string;
  /** Worked example input (illustrative figures) the form can load. */
  example?: Record<string, unknown> | null;
  requestedCode?: string;
  homeEngine: string;
  seriesName: string;
  engineName: string;
  purpose: string;
  dimensionLabels: string[];
  driverContext: string | null;
  correctionProtocols: string[];
  inputs: EngineInputSpec;
  computes: string;
  limits: string;
  pointsCost: number;
  decisionQuality?: {
    requirements: DecisionQualityRequirement[];
    questions: DecisionQualityQuestion[];
  };
};

export type EngineResult = {
  code: string;
  toolId?: string;
  standard?: string;
  requestedCode?: string;
  homeEngine: string;
  engineName: string;
  seriesName: string;
  kind: EngineKind;
  summary: unknown;
  working: string;
  warnings: string[];
  computes?: string;
  limits?: string;
  /** How far the conclusion can be relied on; only `completed` runs are charged. */
  status?: 'completed' | 'provisional' | 'insufficient_evidence';
  /** What is needed for a complete result (unanswered questions, unsupported causes…). */
  missingEvidence?: string[];
};

export type EngineRunResponse = {
  runId?: string;
  pointsCharged?: number;
  balance?: number;
  result: EngineResult;
  nextSteps?: string[];
};

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
        const response = await api<EngineRunResponse>(
          `/engines/${code}/${demo ? 'demo-run' : 'run'}`,
          { input },
          'POST',
        );
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
