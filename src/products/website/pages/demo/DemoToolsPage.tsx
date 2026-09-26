import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Empty } from '../../../../shared/ui/Empty';
import { SkeletonList } from '../../../../shared/ui/Skeleton';
import { useEngineCatalog, type EngineSummary } from '../../../engines/hooks/useEngineCatalog';
import { useEngineRun } from '../../../engines/hooks/useEngineRun';
import { EngineForm } from '../../../engines/pages/EnginesPage';
import { EngineResultView } from '../../../engines/components/EngineResultView';
import '../../../engines/pages/engines-page.css';
import './demo-tools.css';

const HOME_ENGINES = ['All', 'Clarity', 'Capability', 'Consistency', 'Growth', 'Finance', 'Shared'];

/** /demo — public, no signup required. "Explore the workspace" used to drop any visitor straight
 * into a real /os session with no email at all; it now sends them here instead — a real diagnostic
 * engine, run for real (POST /engines/:code/demo-run — same compute as the authenticated path, no
 * charge, no persistence, no account), so a visitor sees one genuine result before deciding to sign
 * up, rather than being handed a fake full workspace. */
export function DemoToolsPage() {
  const { catalog, error } = useEngineCatalog('/engines/catalog');
  const [tab, setTab] = useState('All');
  const [selected, setSelected] = useState<EngineSummary | null>(null);
  const run = useEngineRun(selected?.code ?? null, true);

  const filtered = useMemo(() => {
    if (!catalog) return [];
    return tab === 'All' ? catalog.engines : catalog.engines.filter((e) => e.homeEngine === tab);
  }, [catalog, tab]);

  return (
    <div className="demo-tools-page">
      <div className="demo-tools-container">
        <div className="demo-tools-head">
          <span className="demo-tools-eyebrow">TRY IT — NO ACCOUNT NEEDED</span>
          <h1>Run a Real Diagnostic, Not a Demo Recording.</h1>
          <p>
            Pick any tool below and run it for real — the same compute the product uses, just not
            saved and not charged. When you're ready for the full 248-tool catalog and your own
            workspace, <Link to="/signup">create an account</Link>.
          </p>
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
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
                      {engine.code} · {engine.seriesName}
                    </small>
                  </button>
                </li>
              ))}
            </ul>

            <div className="engines-detail">
              {!selected ? (
                <Empty title="Pick a tool">Choose one from the list to try it for real.</Empty>
              ) : (
                <DemoDetailPanel key={selected.code} engine={selected} run={run} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DemoDetailPanel({
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

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {!manifest ? (
        <SkeletonList rows={3} />
      ) : result ? (
        <>
          <EngineResultView result={result.result} />
          <div className="demo-tools-cta">
            <p>
              That's a real, computed result — not a screenshot. Sign up to save it and unlock the
              other 247 tools.
            </p>
            <Link className="button button-primary" to="/signup">
              Create your account
            </Link>
          </div>
        </>
      ) : (
        <EngineForm manifest={manifest} submitting={running} onSubmit={submit} />
      )}
    </div>
  );
}
