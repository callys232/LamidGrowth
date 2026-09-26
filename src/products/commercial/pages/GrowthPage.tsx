import { useCallback, useEffect, useState } from 'react';
import { BarChart3, FlaskConical } from 'lucide-react';
import { api } from '../../../api';
import { Empty } from '../../../shared/ui/Empty';
import { StatusPill } from '../../../shared/workspace/StatusPill';

type Kpi = {
  id: string;
  name: string;
  unit: string;
  target: number | null;
  calculation_method: string;
  version: number;
};
type Observation = {
  id: string;
  value: number;
  observed_at: string;
  source: string;
  hasEvidence: boolean;
};
type Experiment = {
  id: string;
  title: string;
  hypothesis: string;
  metric: string;
  status: string;
  result: string;
  variants: { name: string; trafficWeightPercent: number }[] | null;
  winning_variant: string | null;
};

function useGrowthPage() {
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [observations, setObservations] = useState<Record<string, Observation[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [kpiName, setKpiName] = useState('');
  const [kpiUnit, setKpiUnit] = useState('');
  const [kpiMethod, setKpiMethod] = useState('');
  const [obsDrafts, setObsDrafts] = useState<Record<string, string>>({});
  const [expTitle, setExpTitle] = useState('');
  const [expHypothesis, setExpHypothesis] = useState('');
  const [expMetric, setExpMetric] = useState('');

  const loadObservations = useCallback(async (kpiId: string) => {
    const rows = await api<Observation[]>(`/kpis/${kpiId}/observations`, undefined, 'GET');
    setObservations((prev) => ({ ...prev, [kpiId]: rows }));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api<Kpi[]>('/kpis', undefined, 'GET'),
      api<Experiment[]>('/experiments', undefined, 'GET'),
    ])
      .then(async ([kpiList, expList]) => {
        setKpis(kpiList);
        setExperiments(expList);
        setError('');
        await Promise.all(kpiList.map((k) => loadObservations(k.id)));
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [loadObservations]);
  useEffect(() => load(), [load]);

  const createKpi = useCallback(async () => {
    if (!kpiName.trim()) return;
    setBusy(true);
    try {
      await api('/kpis', { name: kpiName, unit: kpiUnit, calculationMethod: kpiMethod });
      setKpiName('');
      setKpiUnit('');
      setKpiMethod('');
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [kpiName, kpiUnit, kpiMethod, load]);

  const addObservation = useCallback(
    async (kpiId: string) => {
      const raw = obsDrafts[kpiId];
      const value = Number(raw);
      if (!raw || Number.isNaN(value)) return;
      setBusy(true);
      try {
        await api(`/kpis/${kpiId}/observations`, { value });
        setObsDrafts((prev) => ({ ...prev, [kpiId]: '' }));
        await loadObservations(kpiId);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [obsDrafts, loadObservations],
  );

  const createExperiment = useCallback(async () => {
    if (!expTitle.trim() || !expHypothesis.trim() || !expMetric.trim()) return;
    setBusy(true);
    try {
      await api('/experiments', { title: expTitle, hypothesis: expHypothesis, metric: expMetric });
      setExpTitle('');
      setExpHypothesis('');
      setExpMetric('');
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [expTitle, expHypothesis, expMetric, load]);

  const startExperiment = useCallback(
    async (id: string) => {
      setBusy(true);
      try {
        await api(`/experiments/${id}/start`, {}, 'PATCH');
        load();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  const completeExperiment = useCallback(
    async (id: string, result: string) => {
      if (!result.trim()) return;
      setBusy(true);
      try {
        await api(`/experiments/${id}/complete`, { result }, 'PATCH');
        load();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  return {
    kpis,
    experiments,
    observations,
    loading,
    error,
    busy,
    kpiName,
    setKpiName,
    kpiUnit,
    setKpiUnit,
    kpiMethod,
    setKpiMethod,
    createKpi,
    obsDrafts,
    setObsDrafts,
    addObservation,
    expTitle,
    setExpTitle,
    expHypothesis,
    setExpHypothesis,
    expMetric,
    setExpMetric,
    createExperiment,
    startExperiment,
    completeExperiment,
  };
}

/** /os/growth — KPI definitions with real evidence, and the experiment pipeline. */
export function GrowthPage() {
  const page = useGrowthPage();
  const [resultDrafts, setResultDrafts] = useState<Record<string, string>>({});
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Growth</h2>
          <span>KPIs with real evidence, and experiments with structured results.</span>
        </div>
      </div>
      {page.error && <p className="activity-feed-status activity-feed-error">{page.error}</p>}
      {page.loading && <p className="activity-feed-status">Loading…</p>}

      <h3>KPIs</h3>
      {!page.loading && page.kpis.length === 0 && <Empty title="No KPIs yet">Define one below.</Empty>}
      {!page.loading && page.kpis.length > 0 && (
        <ol className="activity-feed-list">
          {page.kpis.map((kpi) => (
            <li key={kpi.id} className="activity-feed-row" style={{ display: 'block' }}>
              <span className="activity-feed-icon">
                <BarChart3 size={15} />
              </span>
              <strong>{kpi.name}</strong> <small>{kpi.unit}</small>
              {kpi.calculation_method && <p>{kpi.calculation_method}</p>}
              <ul>
                {(page.observations[kpi.id] || []).map((obs) => (
                  <li key={obs.id}>
                    {obs.value} {kpi.unit} · {new Date(obs.observed_at).toLocaleDateString()}
                    {obs.hasEvidence ? ' · has evidence' : ''}
                  </li>
                ))}
              </ul>
              <input
                type="number"
                placeholder="Record a value"
                value={page.obsDrafts[kpi.id] || ''}
                onChange={(e) => page.setObsDrafts((prev) => ({ ...prev, [kpi.id]: e.target.value }))}
              />
              <button type="button" disabled={page.busy} onClick={() => page.addObservation(kpi.id)}>
                Record
              </button>
            </li>
          ))}
        </ol>
      )}
      <div className="settings-card">
        <input type="text" placeholder="KPI name" value={page.kpiName} onChange={(e) => page.setKpiName(e.target.value)} />
        <input type="text" placeholder="Unit (optional)" value={page.kpiUnit} onChange={(e) => page.setKpiUnit(e.target.value)} />
        <input
          type="text"
          placeholder="How is this calculated? (optional but recommended)"
          value={page.kpiMethod}
          onChange={(e) => page.setKpiMethod(e.target.value)}
        />
        <button type="button" disabled={page.busy || !page.kpiName.trim()} onClick={page.createKpi}>
          Define KPI
        </button>
      </div>

      <h3 style={{ marginTop: 32 }}>Experiments</h3>
      {!page.loading && page.experiments.length === 0 && <Empty title="No experiments yet">Draft one below.</Empty>}
      {!page.loading && page.experiments.length > 0 && (
        <ol className="activity-feed-list">
          {page.experiments.map((exp) => (
            <li key={exp.id} className="activity-feed-row" style={{ display: 'block' }}>
              <span className="activity-feed-icon">
                <FlaskConical size={15} />
              </span>
              <strong>{exp.title}</strong> <StatusPill status={exp.status} />
              <p>{exp.hypothesis}</p>
              {exp.variants && (
                <p>
                  Variants: {exp.variants.map((v) => `${v.name} (${v.trafficWeightPercent}%)`).join(', ')}
                </p>
              )}
              {exp.status === 'draft' && (
                <button type="button" disabled={page.busy} onClick={() => page.startExperiment(exp.id)}>
                  Start
                </button>
              )}
              {exp.status === 'running' && (
                <>
                  <input
                    type="text"
                    placeholder="Result"
                    value={resultDrafts[exp.id] || ''}
                    onChange={(e) => setResultDrafts((prev) => ({ ...prev, [exp.id]: e.target.value }))}
                  />
                  <button
                    type="button"
                    disabled={page.busy}
                    onClick={() => page.completeExperiment(exp.id, resultDrafts[exp.id] || '')}
                  >
                    Complete
                  </button>
                </>
              )}
              {exp.status === 'complete' && (
                <p>
                  {exp.result}
                  {exp.winning_variant ? ` — winner: ${exp.winning_variant}` : ''}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
      <div className="settings-card">
        <input type="text" placeholder="Title" value={page.expTitle} onChange={(e) => page.setExpTitle(e.target.value)} />
        <input
          type="text"
          placeholder="Hypothesis"
          value={page.expHypothesis}
          onChange={(e) => page.setExpHypothesis(e.target.value)}
        />
        <input type="text" placeholder="Metric" value={page.expMetric} onChange={(e) => page.setExpMetric(e.target.value)} />
        <button
          type="button"
          disabled={page.busy || !page.expTitle.trim() || !page.expHypothesis.trim() || !page.expMetric.trim()}
          onClick={page.createExperiment}
        >
          Draft experiment
        </button>
      </div>
    </section>
  );
}
