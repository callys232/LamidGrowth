import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { api } from '../../../api';
import { Empty } from '../../../shared/ui/Empty';
import { SkeletonList } from '../../../shared/ui/Skeleton';
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
import { SchemaForm } from '../components/SchemaForm';
import { AnchoredForm } from '../components/AnchoredForm';
import { EngineResultView } from '../components/EngineResultView';
import { EngineScope } from '../components/EngineScope';
import './engines-page.css';

const AREAS = [
  'All',
  'Strategy',
  'Decisions',
  'Operations',
  'Risk',
  'Governance',
  'People',
  'Change',
  'Growth',
  'Finance',
];

/** /os/engines — the standards-based tool catalog: 63 tools, each built on a recognised method
 * (see server: src/app/toolCatalog/*, src/app/engines.mjs). Every run charges points and returns
 * deterministic arithmetic — no tool on this page produces a number a model invented. */
type Coverage = {
  totalEntries: number;
  validation: {
    implemented: number;
    calculationTested: number;
    methodReviewed: number;
    taskEvaluated: number;
    operationallyTested: number;
  };
  byArchetype: Record<string, number>;
};

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
    return tab === 'All' ? catalog.engines : catalog.engines.filter((e) => e.area === tab);
  }, [catalog, tab]);
  const filteredLocked = useMemo(() => {
    if (!catalog?.locked) return [];
    return tab === 'All' ? catalog.locked : catalog.locked.filter((e) => e.area === tab);
  }, [catalog, tab]);

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Tools</h2>
          <span>Each tool follows a recognised method and calculates from your own figures.</span>
        </div>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {coverage && (
        <p className="activity-feed-status">
          {coverage.totalEntries} tools, each built on a named method or standard.{' '}
          {coverage.validation.calculationTested} have figures checked against hand-worked
          answers; {coverage.validation.methodReviewed} have had their method independently
          reviewed.
        </p>
      )}

      <div className="engines-tabs">
        {AREAS.map((name) => (
          <button
            key={name}
            type="button"
            className={name === tab ? 'engines-tab is-active' : 'engines-tab'}
            onClick={() => setTab(name)}
          >
            {name}
            {catalog && name !== 'All' && (
              <span className="engines-tab-count">
                {catalog.engines.filter((e) => e.area === name).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {!catalog ? (
        <div className="engines-layout">
          <SkeletonList rows={8} />
        </div>
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
                    {engine.standard ?? engine.seriesName} · {engine.pointsCost} pts
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
                These engines exist but aren't included in your current tier or bundles — unlock the
                matching seat to get access without a full tier upgrade.
              </span>
            </div>
          </div>
          <ul className="engines-list">
            {filteredLocked.map((engine) => (
              <li key={engine.code}>
                <div
                  className="engines-list-item"
                  style={{ opacity: 0.6, display: 'flex', alignItems: 'center', gap: 8 }}
                >
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
      {(manifest?.standard ?? engine.standard) && (
        <p className="engines-detail-standard">Method: {manifest?.standard ?? engine.standard}</p>
      )}
      <p className="engines-detail-purpose">{manifest?.purpose ?? engine.purpose}</p>
      <EngineScope
        computes={manifest?.computes ?? engine.computes}
        limits={manifest?.limits ?? engine.limits}
      />
      {manifest?.driverContext && <p className="engines-detail-driver">{manifest.driverContext}</p>}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {!manifest ? (
        <SkeletonList rows={3} />
      ) : result ? (
        <EngineResultView
          pointsCharged={result.pointsCharged}
          balance={result.balance}
          nextSteps={result.nextSteps}
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
    case 'schema': {
      const spec = manifest.inputs as Extract<typeof manifest.inputs, { kind: 'schema' }>;
      return (
        <SchemaForm
          key={manifest.code}
          toolKey={manifest.code}
          fields={spec.fields}
          tables={spec.tables}
          example={manifest.example}
          onSubmit={onSubmit}
          submitting={submitting}
        />
      );
    }
    case 'anchored': {
      const spec = manifest.inputs as Extract<typeof manifest.inputs, { kind: 'anchored' }>;
      return (
        <AnchoredForm
          key={manifest.code}
          toolKey={manifest.code}
          sections={spec.sections}
          levels={spec.levels}
          evidence={spec.evidence}
          example={manifest.example}
          onSubmit={onSubmit}
          submitting={submitting}
        />
      );
    }
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
        <SkeletonList rows={3} />
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
