import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import { Modal } from '../../../../shared/ui/Modal';
import { useEngineCatalog, type EngineSummary } from '../../../engines/hooks/useEngineCatalog';
import './engine-demo-preview.css';

export function CatalogEngineDemo({ engine }: { engine: EngineSummary }) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <>
      <button
        type="button"
        className="button button-secondary"
        aria-label={`Demo engine: ${engine.engineName}`}
        aria-haspopup="dialog"
        onClick={() => {
          setFailed(false);
          setOpen(true);
        }}
      >
        <Play size={16} aria-hidden="true" />
        Demo engine
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

export function AllEngineDemos() {
  const { catalog, error } = useEngineCatalog('/engines/catalog');
  const [query, setQuery] = useState('');
  const [area, setArea] = useState('');
  const engines = catalog?.engines ?? [];
  const visible = engines.filter(
    (engine) =>
      (!area || engine.area === area) &&
      `${engine.engineName} ${engine.purpose} ${engine.area}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
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
        <div className="catalog-demo-filters">
          <label>
            Find a tool
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tools"
            />
          </label>
          <label>
            Subject area
            <select value={area} onChange={(e) => setArea(e.target.value)}>
              <option value="">All areas</option>
              {[...new Set(engines.map((e) => e.area).filter(Boolean))].map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error && <p role="alert">{error}</p>}
        {!catalog && !error && <p role="status">Loading engine demos…</p>}
        {catalog && (
          <p aria-live="polite">
            {visible.length} of {engines.length} tools
          </p>
        )}
        <ul className="catalog-demo-grid">
          {visible.map((engine) => (
            <li key={engine.code}>
              <span>{engine.area}</span>
              <h3>{engine.engineName}</h3>
              <p>{engine.purpose}</p>
              <CatalogEngineDemo engine={engine} />
            </li>
          ))}
        </ul>
        {catalog && !visible.length && <p>No tools match. Try another search or area.</p>}
      </div>
    </section>
  );
}
