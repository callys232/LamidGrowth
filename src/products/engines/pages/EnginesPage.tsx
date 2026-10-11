import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Cpu, Lock, PlayCircle } from 'lucide-react';
import { api } from '../../../api';
import { Empty } from '../../../shared/ui/Empty';
import { SkeletonList } from '../../../shared/ui/Skeleton';
import { PageHeader } from '../../../shared/workspace/ui/PageHeader';
import type { Kpi } from '../../workspace/overview/overviewModel';
import { readDemoSession } from '../../workspace/sandbox/demoSession';
import { useEngineCatalog, type EngineSummary } from '../hooks/useEngineCatalog';
import { useEngineRun } from '../hooks/useEngineRun';
import { AREAS, areaOf, ToolCatalog } from '../components/ToolCatalog';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { catalog, error } = useEngineCatalog();
  const selected = useMemo(() => {
    // ?tool= is the old parameter name; links already shared with it keep working.
    const code = searchParams.get('engine') ?? searchParams.get('tool');
    return catalog?.engines.find((engine) => engine.code === code) ?? null;
  }, [catalog, searchParams]);
  // The demo never loads a tool's server manifest: tools run only in a real workspace.
  const run = useEngineRun(readDemoSession() ? null : (selected?.code ?? null));
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  useEffect(() => {
    api<Coverage>('/engines/catalog/coverage', undefined, 'GET')
      .then(setCoverage)
      .catch(() => {});
  }, []);
  // Opening a tool is a navigation: linkable, and the back button returns to the catalog.
  const open = (engine: EngineSummary | null) => {
    const next = new URLSearchParams(searchParams);
    next.delete('tool');
    if (engine) next.set('engine', engine.code);
    else next.delete('engine');
    setSearchParams(next);
    window.scrollTo({ top: 0 });
  };

  const locked = catalog?.locked ?? [];
  const total = catalog?.engines.length ?? 0;
  const kpis: Kpi[] = [
    {
      domain: 'intelligence',
      label: 'Engines available',
      value: String(total),
      hint: catalog?.locked?.length
        ? `${catalog.locked.length} more with another seat`
        : 'All included in your plan',
      to: '/os/engines',
    },
    {
      domain: 'intelligence',
      label: 'Subject areas',
      value: String(AREAS.filter((a) => catalog?.engines.some((e) => e.area === a.name)).length),
      hint: 'Strategy to finance',
      to: '/os/engines',
    },
    {
      domain: 'money',
      label: 'Figures hand-checked',
      value: coverage ? String(coverage.validation.calculationTested) : '—',
      hint: 'Results matched to worked answers',
      to: '/os/engines',
    },
    {
      domain: 'work',
      label: 'Methods reviewed',
      value: coverage ? String(coverage.validation.methodReviewed) : '—',
      hint: 'Independently reviewed so far',
      to: '/os/engines',
    },
  ];

  if (selected) {
    const meta = areaOf(selected.area);
    const Icon = meta?.icon ?? Cpu;
    return (
      <div
        className="ws-page ws-workbench"
        data-domain={meta?.tone ?? 'intelligence'}
        data-scroll-feedback="off"
      >
        <button type="button" className="ws-back" onClick={() => open(null)}>
          <ArrowLeft size={15} aria-hidden="true" /> All engines
        </button>
        <header className="ws-workbench-head">
          <span className="ws-tool-icon ws-workbench-icon" aria-hidden="true">
            <Icon size={22} />
          </span>
          <div>
            <span className="ws-workbench-eyebrow">
              {selected.area ?? selected.homeEngine} · {selected.pointsCost} points per run
            </span>
            <h1>{selected.engineName}</h1>
            <p>{selected.standard ?? selected.seriesName}</p>
          </div>
        </header>
        <section className="ws-panel ws-workbench-panel">
          <EngineDetailPanel key={selected.code} engine={selected} run={run} />
        </section>
      </div>
    );
  }

  return (
    <div className="ws-page" data-domain="intelligence" data-scroll-feedback="off">
      <PageHeader
        eyebrow="INTELLIGENCE · ENGINES"
        title="Engines"
        description="The decision and analysis engines open to your workspace, and what each one calculates."
        kpis={catalog ? kpis : []}
        loadingKpis={catalog ? 0 : 4}
      />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <ToolCatalog engines={catalog?.engines ?? null} onOpen={open} idPrefix="engines" />

      {catalog && locked.length > 0 && (
        <section className="ws-tool-group ws-tool-locked" aria-label="Locked for your plan">
          <header>
            <h2>Locked for your plan</h2>
            <span>
              Included with another seat — unlock it without a full tier upgrade.{' '}
              <Link to="/os/pricing">See seats and bundles</Link>
            </span>
          </header>
          <div className="ws-tool-grid">
            {locked.map((engine) => (
              <div className="ws-tool" data-locked key={engine.code}>
                <span className="ws-tool-top">
                  <span className="ws-tool-icon" aria-hidden="true">
                    <Lock size={15} />
                  </span>
                  <span className="ws-tool-area">{engine.area ?? engine.homeEngine}</span>
                </span>
                <strong>{engine.engineName}</strong>
                <span className="ws-tool-method">Requires the {engine.homeEngine} seat</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
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

      {readDemoSession() ? (
        // Tools calculate on the server; the sample workspace never sends data there.
        <div className="ws-demo-run">
          <PlayCircle size={22} aria-hidden="true" />
          <div>
            <strong>Running engines needs your own workspace</strong>
            <p>
              Every result is calculated on our servers from the figures you enter, so the sample
              workspace can show what an engine measures but not run it.
            </p>
            <div className="ws-demo-run-actions">
              <Link className="button button-primary" to="/signup">
                Create your workspace
              </Link>
              <Link className="button button-secondary" to="/demo#try-decision-quality">
                Try Decision Quality live
              </Link>
            </div>
          </div>
        </div>
      ) : !manifest ? (
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
