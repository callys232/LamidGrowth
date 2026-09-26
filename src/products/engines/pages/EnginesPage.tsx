import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { api } from '../../../api';
import { Empty } from '../../../shared/ui/Empty';
import { useEngineCatalog, type EngineSummary } from '../hooks/useEngineCatalog';
import { useEngineRun } from '../hooks/useEngineRun';
import { AssessmentForm } from '../components/AssessmentForm';
import { FinancialForm } from '../components/FinancialForm';
import { TimeseriesForm } from '../components/TimeseriesForm';
import { NarrativeForm } from '../components/NarrativeForm';
import { RosterForm } from '../components/RosterForm';
import { ScenarioSimpleForm } from '../components/ScenarioSimpleForm';
import { DecisionQualityForm } from '../components/DecisionQualityForm';
import { GrowthPathwaysForm } from '../components/GrowthPathwaysForm';
import { BenchStrengthForm } from '../components/BenchStrengthForm';
import { ScenarioDecisionForm } from '../components/ScenarioDecisionForm';
import { RoadmapForm } from '../components/RoadmapForm';
import { OptimisationForm } from '../components/OptimisationForm';
import { SelectorForm } from '../components/SelectorForm';
import { ConflictForm } from '../components/ConflictForm';
import { EngineResultView } from '../components/EngineResultView';
import './engines-page.css';

const HOME_ENGINES = ['All', 'Clarity', 'Capability', 'Consistency', 'Growth', 'Finance', 'Shared'];

/** /os/engines — the ported intelligence-engine catalog: 248 diagnostic tools, each a real
 * deterministic compute (see server: src/app/engines.mjs, src/app/engineIntelligence/*), ported
 * from LamidOne's src/lib/intelligence layer. Every run charges points and returns arithmetic —
 * no engine on this page produces a number a model invented. */
type Coverage = { totalEntries: number; verifiedCount: number; byArchetype: Record<string, number> };

export function EnginesPage() {
  const { catalog, error } = useEngineCatalog();
  const [tab, setTab] = useState('All');
  const [selected, setSelected] = useState<EngineSummary | null>(null);
  const run = useEngineRun(selected?.code ?? null);
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  useEffect(() => {
    api<Coverage>('/engines/catalog/coverage', undefined, 'GET')
      .then(setCoverage)
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    if (!catalog) return [];
    return tab === 'All' ? catalog.engines : catalog.engines.filter((e) => e.homeEngine === tab);
  }, [catalog, tab]);
  const filteredLocked = useMemo(() => {
    if (!catalog?.locked) return [];
    return tab === 'All' ? catalog.locked : catalog.locked.filter((e) => e.homeEngine === tab);
  }, [catalog, tab]);

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Engines</h2>
          <span>Structured diagnostics — real computed results, not AI-guessed scores.</span>
        </div>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {coverage && (
        <p className="activity-feed-status">
          {coverage.totalEntries} registered entries · {coverage.verifiedCount} individually
          verified against a canonical capability — the rest share {Object.keys(coverage.byArchetype).length}{' '}
          real compute archetypes, honestly unverified per-entry rather than fabricated.
        </p>
      )}

      <div className="engines-tabs">
        {HOME_ENGINES.map((name) => (
          <button
            key={name}
            type="button"
            className={name === tab ? 'engines-tab is-active' : 'engines-tab'}
            onClick={() => setTab(name)}
          >
            {name}
            {catalog && name !== 'All' && (
              <span className="engines-tab-count">
                {catalog.engines.filter((e) => e.homeEngine === name).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {!catalog ? (
        <Empty title="Loading…">Fetching the engine catalog.</Empty>
      ) : (
        <div className="engines-layout">
          <ul className="engines-list">
            {filtered.map((engine) => (
              <li key={engine.code}>
                <button
                  type="button"
                  className={
                    selected?.code === engine.code
                      ? 'engines-list-item is-active'
                      : 'engines-list-item'
                  }
                  onClick={() => setSelected(engine)}
                >
                  <strong>{engine.engineName}</strong>
                  <small>
                    {engine.code} · {engine.seriesName} · {engine.pointsCost} pts
                  </small>
                </button>
              </li>
            ))}
          </ul>

          <div className="engines-detail">
            {!selected ? (
              <Empty title="Pick a diagnostic">
                Choose one from the list to see what it measures and run it.
              </Empty>
            ) : (
              <EngineDetailPanel key={selected.code} engine={selected} run={run} />
            )}
          </div>
        </div>
      )}

      {filteredLocked.length > 0 && (
        <div className="engines-locked" style={{ marginTop: 24 }}>
          <div className="panel-heading">
            <div>
              <h3>Locked for your plan</h3>
              <span>
                These engines exist but aren't included in your current tier or bundles — unlock
                the matching seat to get access without a full tier upgrade.
              </span>
            </div>
          </div>
          <ul className="engines-list">
            {filteredLocked.map((engine) => (
              <li key={engine.code}>
                <div className="engines-list-item" style={{ opacity: 0.6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Lock size={14} />
                  <span>
                    <strong>{engine.engineName}</strong>
                    <small>
                      {engine.code} · {engine.seriesName} · requires the {engine.homeEngine} seat
                    </small>
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <Link to="/os/pricing" className="button button-secondary">
            See seats and bundles on Pricing
          </Link>
        </div>
      )}
    </section>
  );
}

function EngineDetailPanel({
  engine,
  run,
}: {
  engine: EngineSummary;
  run: ReturnType<typeof useEngineRun>;
}) {
  const { manifest, running, result, error, run: submit } = run;

  return (
    <div className="engines-detail-inner">
      <h3>{engine.engineName}</h3>
      <p className="engines-detail-purpose">{manifest?.purpose ?? engine.purpose}</p>
      {manifest?.driverContext && <p className="engines-detail-driver">{manifest.driverContext}</p>}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {!manifest ? (
        <Empty title="Loading…">Fetching this diagnostic's input form.</Empty>
      ) : result ? (
        <EngineResultView
          pointsCharged={result.pointsCharged}
          balance={result.balance}
          result={result.result}
        />
      ) : (
        <EngineForm manifest={manifest} submitting={running} onSubmit={submit} />
      )}
    </div>
  );
}

/** Exported for reuse by the public /demo page (see products/website/pages/demo/DemoToolsPage.tsx)
 * — same 14-kind form-selection logic for both the authenticated and no-signup-required paths. */
export function EngineForm({
  manifest,
  submitting,
  onSubmit,
}: {
  manifest: NonNullable<ReturnType<typeof useEngineRun>['manifest']>;
  submitting: boolean;
  onSubmit: (input: Record<string, unknown>) => void;
}) {
  switch (manifest.inputs.kind) {
    case 'assessment':
      return (
        <AssessmentForm
          dimensionLabels={manifest.dimensionLabels}
          onSubmit={onSubmit}
          submitting={submitting}
        />
      );
    case 'financial': {
      const spec = manifest.inputs as { periodLabel: string; periods: number };
      return (
        <FinancialForm
          periodLabel={spec.periodLabel}
          periods={spec.periods}
          onSubmit={onSubmit}
          submitting={submitting}
        />
      );
    }
    case 'timeseries': {
      const spec = manifest.inputs as {
        periodLabel: string;
        periods: number;
        metrics: import('../hooks/useEngineRun').SeriesMetric[];
      };
      return (
        <TimeseriesForm
          periodLabel={spec.periodLabel}
          periods={spec.periods}
          metrics={spec.metrics}
          onSubmit={onSubmit}
          submitting={submitting}
        />
      );
    }
    case 'narrative':
      return <NarrativeForm onSubmit={onSubmit} submitting={submitting} />;
    case 'roster':
      return <RosterForm onSubmit={onSubmit} submitting={submitting} />;
    case 'scenario':
      return <ScenarioSimpleForm onSubmit={onSubmit} submitting={submitting} />;
    case 'decision-quality':
      return manifest.decisionQuality ? (
        <DecisionQualityForm
          requirements={manifest.decisionQuality.requirements}
          questions={manifest.decisionQuality.questions}
          onSubmit={onSubmit}
          submitting={submitting}
        />
      ) : (
        <Empty title="Loading…">Fetching the question bank.</Empty>
      );
    case 'growth-pathways':
      return <GrowthPathwaysForm onSubmit={onSubmit} submitting={submitting} />;
    case 'bench-strength':
      return <BenchStrengthForm onSubmit={onSubmit} submitting={submitting} />;
    case 'scenario-decision':
      return <ScenarioDecisionForm onSubmit={onSubmit} submitting={submitting} />;
    case 'roadmap':
      return <RoadmapForm onSubmit={onSubmit} submitting={submitting} />;
    case 'optimisation':
      return <OptimisationForm onSubmit={onSubmit} submitting={submitting} />;
    case 'selection':
      return <SelectorForm onSubmit={onSubmit} submitting={submitting} />;
    case 'conflict':
      return <ConflictForm onSubmit={onSubmit} submitting={submitting} />;
    default:
      return (
        <Empty title="Form coming soon">
          This diagnostic type is computed and ready on the server, but its input form hasn't
          shipped to this page yet.
        </Empty>
      );
  }
}
