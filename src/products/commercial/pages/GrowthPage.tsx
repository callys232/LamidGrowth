import { useCallback, useEffect, useState } from 'react';
import { BarChart3, FlaskConical, Plus } from 'lucide-react';
import { api } from '../../../api';
import { Button } from '../../../shared/ui/Button';
import { SkeletonList } from '../../../shared/ui/Skeleton';
import { PageHeader } from '../../../shared/workspace/ui/PageHeader';
import { StatusPill } from '../../../shared/workspace/ui/StatusPill';
import type { Kpi as OverviewKpi } from '../../workspace/overview/overviewModel';

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

const EXPERIMENT_TONE = { draft: 'neutral', running: 'opportunities', complete: 'money' } as const;
const shortDate = (iso: string) =>
  new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(iso));

/** /os/growth — KPI definitions with real evidence, and the experiment pipeline. */
export function GrowthPage() {
  const page = useGrowthPage();
  const [resultDrafts, setResultDrafts] = useState<Record<string, string>>({});
  const recorded = page.kpis.filter((k) => (page.observations[k.id] ?? []).length > 0).length;
  const running = page.experiments.filter((e) => e.status === 'running').length;
  const kpiTiles: OverviewKpi[] = [
    {
      domain: 'opportunities',
      label: 'KPIs defined',
      value: String(page.kpis.length),
      hint: `${recorded} with recorded values`,
      to: '/os/growth',
    },
    {
      domain: 'opportunities',
      label: 'Experiments running',
      value: String(running),
      hint: `${page.experiments.length} in total`,
      to: '/os/growth',
    },
    {
      domain: 'money',
      label: 'Completed experiments',
      value: String(page.experiments.filter((e) => e.status === 'complete').length),
      hint: 'With a recorded result',
      to: '/os/growth',
    },
  ];
  return (
    <div className="ws-page" data-domain="opportunities">
      <PageHeader
        eyebrow="OPPORTUNITIES · GROWTH"
        title="Growth"
        description="The KPIs you track and the experiments testing what moves them."
        kpis={page.loading ? [] : kpiTiles}
        loadingKpis={page.loading ? 3 : 0}
      />
      {page.error && (
        <p className="form-error" role="alert">
          {page.error}
        </p>
      )}

      <section className="ws-panel" aria-labelledby="kpis-title">
        <div className="ws-panel-heading">
          <div>
            <h2 id="kpis-title">KPIs</h2>
            <span>Each value is recorded evidence, plotted in the order it was observed.</span>
          </div>
        </div>
        {page.loading ? (
          <div className="ws-trends">
            <SkeletonList rows={3} />
          </div>
        ) : page.kpis.length === 0 ? (
          <div className="ws-panel-state ws-empty">
            <BarChart3 size={28} aria-hidden="true" />
            <h3>No KPIs yet</h3>
            <p>Define the measures that matter below, then record values as you observe them.</p>
          </div>
        ) : (
          <div className="ws-trends">
            {page.kpis.map((kpi) => {
              const values = page.observations[kpi.id] ?? [];
              const latest = values.at(-1);
              const peak = Math.max(kpi.target ?? 0, ...values.map((v) => v.value), 1);
              return (
                <article className="ws-trend ws-kpi" key={kpi.id}>
                  <header>
                    <strong>{kpi.name}</strong>
                    {kpi.unit && <StatusPill tone="neutral">{kpi.unit}</StatusPill>}
                  </header>
                  <div className="ws-trend-body">
                    <div>
                      <span className="ws-trend-value">
                        {latest ? latest.value : '—'}
                        {latest && kpi.unit === '%' ? '%' : ''}
                      </span>
                      <small>
                        {latest
                          ? `Recorded ${shortDate(latest.observed_at)}${kpi.target !== null ? ` · target ${kpi.target}` : ''}`
                          : 'No values recorded yet'}
                      </small>
                    </div>
                    <div
                      className="ws-trend-bars"
                      role="img"
                      aria-label={`Recorded values: ${values.map((v) => v.value).join(', ') || 'none'}`}
                    >
                      {values.map((obs) => (
                        <span key={obs.id} title={`${shortDate(obs.observed_at)} · ${obs.value}`}>
                          <i style={{ height: `${Math.max((obs.value / peak) * 100, 4)}%` }} />
                        </span>
                      ))}
                    </div>
                  </div>
                  {kpi.target !== null && latest && (
                    <div className="ws-progress" aria-label={`Toward target ${kpi.target}`}>
                      <div className="ws-progress-track">
                        <span
                          style={{
                            width: `${Math.min(100, (latest.value / (kpi.target || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {kpi.calculation_method && (
                    <p className="ws-kpi-method">{kpi.calculation_method}</p>
                  )}
                  <form
                    className="ws-kpi-record"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void page.addObservation(kpi.id);
                    }}
                  >
                    <input
                      type="number"
                      aria-label={`Record a value for ${kpi.name}`}
                      placeholder="Record a value"
                      value={page.obsDrafts[kpi.id] || ''}
                      onChange={(e) =>
                        page.setObsDrafts((prev) => ({ ...prev, [kpi.id]: e.target.value }))
                      }
                    />
                    <Button
                      type="submit"
                      variant="secondary"
                      disabled={page.busy || !page.obsDrafts[kpi.id]}
                    >
                      Record
                    </Button>
                  </form>
                </article>
              );
            })}
          </div>
        )}
        <form
          className="ws-inline-form ws-inline-form-3"
          onSubmit={(e) => {
            e.preventDefault();
            void page.createKpi();
          }}
        >
          <label>
            <span>KPI name</span>
            <input
              type="text"
              value={page.kpiName}
              onChange={(e) => page.setKpiName(e.target.value)}
              placeholder="e.g. Monthly recurring revenue"
            />
          </label>
          <label>
            <span>Unit</span>
            <input
              type="text"
              value={page.kpiUnit}
              onChange={(e) => page.setKpiUnit(e.target.value)}
              placeholder="Optional — USD, %, count"
            />
          </label>
          <label>
            <span>How it’s calculated</span>
            <input
              type="text"
              value={page.kpiMethod}
              onChange={(e) => page.setKpiMethod(e.target.value)}
              placeholder="Recommended"
            />
          </label>
          <Button type="submit" disabled={page.busy || !page.kpiName.trim()}>
            <Plus size={15} /> Define KPI
          </Button>
        </form>
      </section>

      <section className="ws-panel" aria-labelledby="experiments-title">
        <div className="ws-panel-heading">
          <div>
            <h2 id="experiments-title">Experiments</h2>
            <span>Draft a hypothesis, run it, and record what actually happened.</span>
          </div>
        </div>
        {!page.loading && page.experiments.length === 0 ? (
          <div className="ws-panel-state ws-empty">
            <FlaskConical size={28} aria-hidden="true" />
            <h3>No experiments yet</h3>
            <p>Draft one below to test what moves your KPIs.</p>
          </div>
        ) : (
          <div className="ws-trends">
            {page.experiments.map((exp) => (
              <article className="ws-trend ws-experiment" key={exp.id}>
                <header>
                  <strong>{exp.title}</strong>
                  <StatusPill
                    tone={EXPERIMENT_TONE[exp.status as keyof typeof EXPERIMENT_TONE] ?? 'neutral'}
                  >
                    {exp.status}
                  </StatusPill>
                </header>
                <p className="ws-experiment-hypothesis">{exp.hypothesis}</p>
                <p className="ws-kpi-method">Metric: {exp.metric}</p>
                {exp.variants && (
                  <div className="ws-split" aria-label="Traffic split">
                    {exp.variants.map((v) => (
                      <span
                        key={v.name}
                        style={{ flexBasis: `${v.trafficWeightPercent}%` }}
                        data-winner={exp.winning_variant === v.name || undefined}
                      >
                        {v.name} · {v.trafficWeightPercent}%
                      </span>
                    ))}
                  </div>
                )}
                {exp.status === 'draft' && (
                  <Button disabled={page.busy} onClick={() => page.startExperiment(exp.id)}>
                    Start experiment
                  </Button>
                )}
                {exp.status === 'running' && (
                  <form
                    className="ws-kpi-record"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void page.completeExperiment(exp.id, resultDrafts[exp.id] || '');
                    }}
                  >
                    <input
                      type="text"
                      aria-label={`Result for ${exp.title}`}
                      placeholder="What happened?"
                      value={resultDrafts[exp.id] || ''}
                      onChange={(e) =>
                        setResultDrafts((prev) => ({ ...prev, [exp.id]: e.target.value }))
                      }
                    />
                    <Button type="submit" variant="secondary" disabled={page.busy}>
                      Complete
                    </Button>
                  </form>
                )}
                {exp.status === 'complete' && (
                  <p className="ws-experiment-result">
                    {exp.result}
                    {exp.winning_variant ? ` — winner: ${exp.winning_variant}` : ''}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
        <form
          className="ws-inline-form ws-inline-form-3"
          onSubmit={(e) => {
            e.preventDefault();
            void page.createExperiment();
          }}
        >
          <label>
            <span>Experiment title</span>
            <input
              type="text"
              value={page.expTitle}
              onChange={(e) => page.setExpTitle(e.target.value)}
            />
          </label>
          <label>
            <span>Hypothesis</span>
            <input
              type="text"
              value={page.expHypothesis}
              onChange={(e) => page.setExpHypothesis(e.target.value)}
            />
          </label>
          <label>
            <span>Metric</span>
            <input
              type="text"
              value={page.expMetric}
              onChange={(e) => page.setExpMetric(e.target.value)}
            />
          </label>
          <Button
            type="submit"
            disabled={
              page.busy ||
              !page.expTitle.trim() ||
              !page.expHypothesis.trim() ||
              !page.expMetric.trim()
            }
          >
            <Plus size={15} /> Draft experiment
          </Button>
        </form>
      </section>
    </div>
  );
}
