import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import { Modal } from '../../../../shared/ui/Modal';
import { ToolCatalog } from '../../../engines/components/ToolCatalog';
import { useEngineCatalog, type EngineSummary } from '../../../engines/hooks/useEngineCatalog';
import './engine-demo-preview.css';

export function CatalogEngineDemo({
  engine,
  compact = false,
}: {
  engine: EngineSummary;
  /** A small text-style trigger for catalog rows. */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <>
      <button
        type="button"
        className={compact ? 'ws-row-demo' : 'button button-secondary'}
        aria-label={`Demo engine: ${engine.engineName}`}
        aria-haspopup="dialog"
        onClick={() => {
          setFailed(false);
          setOpen(true);
        }}
      >
        <Play size={compact ? 14 : 16} aria-hidden="true" />
        {compact ? 'Watch demo' : 'Demo engine'}
      </button>
      {open && (
        <Modal title={`${engine.engineName} demo`} onClose={() => setOpen(false)} wide>
          <div className="engine-demo-preview">
            <div className="engine-demo-visual">
              {failed ? (
                <p role="alert">
                  The walkthrough could not load. You can still review this tool’s scope below.
                </p>
              ) : (
                <video
                  className="catalog-demo-video"
                  src={`/videos/engines/${engine.code}.webm`}
                  autoPlay
                  muted
                  loop
                  playsInline
                  aria-label={`${engine.engineName}: inputs, analysis and scope walkthrough`}
                  onError={() => setFailed(true)}
                />
              )}
            </div>
            <aside>
              <h3>What this engine helps you do</h3>
              <ul>
                <li>
                  <strong>Purpose</strong>
                  <p>{engine.purpose}</p>
                </li>
                <li>
                  <strong>Analysis</strong>
                  <p>{engine.computes}</p>
                </li>
                <li>
                  <strong>Scope and limitations</strong>
                  <p>{engine.limits}</p>
                </li>
              </ul>
            </aside>
            <footer>
              <p>Instructional walkthrough of this tool’s declared inputs and outputs.</p>
              <Link
                className="button button-primary"
                to={`/os/engines?tool=${encodeURIComponent(engine.code)}`}
              >
                Get your diagnosis
              </Link>
            </footer>
          </div>
        </Modal>
      )}
    </>
  );
}

/** /demo — every engine in the shared catalog layout (area filter, one fixed card, collapsed area
 * dropdowns). Each row's action opens that engine's walkthrough in a popup. */
export function AllEngineDemos() {
  const { catalog, error } = useEngineCatalog('/engines/catalog');
  return (
    <section id="all-engine-demos" className="demo-slide">
      <div className="demo-tools-container">
        <div className="demo-section-head">
          <h2>Explore every engine</h2>
          <p>
            Watch how each tool uses your inputs, what it calculates, and how to interpret its
            scope.
          </p>
        </div>
        {error && <p role="alert">{error}</p>}
        <ToolCatalog
          engines={catalog?.engines ?? (error ? [] : null)}
          action={(engine) => <CatalogEngineDemo engine={engine} compact />}
          idPrefix="demo-engines"
        />
      </div>
    </section>
  );
}
