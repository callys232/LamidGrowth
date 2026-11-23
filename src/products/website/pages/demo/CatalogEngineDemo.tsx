import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Play, Search } from 'lucide-react';
import { Modal } from '../../../../shared/ui/Modal';
import { SkeletonList } from '../../../../shared/ui/Skeleton';
import { AREAS } from '../../../engines/components/ToolCatalog';
import { useEngineCatalog, type EngineSummary } from '../../../engines/hooks/useEngineCatalog';
import './engine-demo-preview.css';

const TOPIC_META: Record<string, { label: string; prompt: string; thumb: string }> = {
  Strategy: {
    label: 'Setting direction',
    prompt: 'Pick clear priorities and stop chasing everything at once',
    thumb: '/media/suites/strategy-3d.jpg',
  },
  Decisions: {
    label: 'Making big calls',
    prompt: 'Compare options clearly before you commit time or money',
    thumb: '/media/suites/decisions-3d.jpg',
  },
  Operations: {
    label: 'Fixing delivery & flow',
    prompt: 'Spot bottlenecks, balance workloads, and keep projects moving',
    thumb: '/media/suites/operations-3d.jpg',
  },
  Risk: {
    label: 'Protecting your business',
    prompt: 'Catch early warning signs before small issues become costly',
    thumb: '/media/suites/risk-governance-3d.jpg',
  },
  Governance: {
    label: 'Staying compliant',
    prompt: 'Keep policies, controls, and leadership reviews on track',
    thumb: '/media/suites/advisory-3d.jpg',
  },
  People: {
    label: 'Building your team',
    prompt: 'Close skill gaps, clarify roles, and grow future leaders',
    thumb: '/media/suites/people-3d.jpg',
  },
  Change: {
    label: 'Leading change',
    prompt: 'Get your team ready so new plans and systems actually stick',
    thumb: '/media/suites/growth-change-3d.jpg',
  },
  Growth: {
    label: 'Growing revenue',
    prompt: 'Find new markets, sequence your bets, and scale sustainably',
    thumb: '/media/hero/pillar-03-growth.jpg',
  },
  Finance: {
    label: 'Managing cash & value',
    prompt: 'Protect your cash runway and see what really drives profit',
    thumb: '/media/suites/finance-3d.jpg',
  },
};

function AssetCard({ engine }: { engine: EngineSummary }) {
  const topic = (engine.area && TOPIC_META[engine.area]?.label) || engine.area || 'Business workflow';
  const tags = engine.dimensionLabels?.slice(0, 3) ?? [];

  return (
    <article className="demo-topic-card">
      <div className="demo-topic-card-body">
        <span className="demo-topic-card-eyebrow">{topic}</span>
        <h4>{engine.engineName}</h4>
        <p>{engine.purpose}</p>
        {tags.length > 0 && (
          <ul className="demo-topic-card-tags" aria-label="Focus areas">
            {tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="demo-topic-card-foot">
        <CatalogEngineDemo engine={engine} compact />
      </div>
    </article>
  );
}

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
                  The walkthrough could not load. You can still review this engine’s scope below.
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
              <p>Instructional walkthrough of this engine’s declared inputs and outputs.</p>
              <Link
                className="button button-primary"
                to="/demo#start-here"
              >
                Try a live engine
              </Link>
            </footer>
          </div>
        </Modal>
      )}
    </>
  );
}

/** /demo — topic-based asset explorer grouped by everyday business topics. */
export function AllEngineDemos() {
  const { catalog, error } = useEngineCatalog('/engines/catalog');
  const [selectedArea, setSelectedArea] = useState<string>('All');
  const [openArea, setOpenArea] = useState<string | null>('Operations');
  const [query, setQuery] = useState('');

  const engines = catalog?.engines ?? (error ? [] : null);
  const q = query.trim().toLowerCase();
  const filtered = (engines ?? []).filter((engine) => {
    if (!q) return true;
    const topicLabel = engine.area ? TOPIC_META[engine.area]?.label ?? '' : '';
    const dims = engine.dimensionLabels?.join(' ') ?? '';
    return `${engine.engineName} ${engine.purpose} ${topicLabel} ${engine.area ?? ''} ${dims}`
      .toLowerCase()
      .includes(q);
  });

  const groups = AREAS.map((a) => ({
    area: a,
    meta: TOPIC_META[a.name] ?? { label: a.name, prompt: a.helps },
    items: filtered.filter((engine) => engine.area === a.name),
  })).filter((g) => g.items.length > 0);

  const activeGroup = groups.find((g) => g.area.name === selectedArea);

  return (
    <section id="all-engine-demos" className="demo-slide">
      <div className="demo-tools-container">
        <div className="demo-section-head">
          <span className="demo-tools-eyebrow">Explore by topic</span>
          <h2>Find what helps with your challenge</h2>
          <p>Browse assets grouped by everyday business topics—no jargon, no setup required.</p>
        </div>
        {error && <p role="alert">{error}</p>}

        <div className="demo-topic-explorer">
          <div className="demo-topic-controls">
            <div className="demo-topic-tabs" role="tablist" aria-label="Business topics">
              <button
                type="button"
                role="tab"
                className="demo-topic-tab"
                aria-selected={selectedArea === 'All'}
                onClick={() => setSelectedArea('All')}
              >
                All topics
              </button>
              {AREAS.map((a) => {
                const Icon = a.icon;
                const topic = TOPIC_META[a.name]?.label ?? a.name;
                return (
                  <button
                    key={a.name}
                    type="button"
                    role="tab"
                    className="demo-topic-tab"
                    aria-selected={selectedArea === a.name}
                    onClick={() => setSelectedArea(a.name)}
                  >
                    <Icon size={14} aria-hidden="true" />
                    {topic}
                  </button>
                );
              })}
            </div>

            <label className="demo-topic-search">
              <Search size={15} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by topic — e.g. cash flow, hiring, bottlenecks"
                aria-label="Search assets by topic"
              />
            </label>
          </div>

          {engines === null ? (
            <SkeletonList rows={5} />
          ) : filtered.length === 0 ? (
            <div className="demo-topic-empty">
              No assets matched “{query.trim()}”. Try another topic such as cash, hiring, or risk.
            </div>
          ) : selectedArea !== 'All' && activeGroup ? (
            <div>
              <div className="demo-topic-banner">
                <div className="demo-topic-group-icon">
                  <activeGroup.area.icon size={18} aria-hidden="true" />
                </div>
                <div>
                  <strong>{activeGroup.meta.label}</strong>
                  <span>{activeGroup.meta.prompt}</span>
                </div>
              </div>
              <div className="demo-topic-assets-grid">
                {activeGroup.items.map((engine) => (
                  <AssetCard key={engine.code} engine={engine} />
                ))}
              </div>
            </div>
          ) : q ? (
            <div className="demo-topic-assets-grid">
              {filtered.map((engine) => (
                <AssetCard key={engine.code} engine={engine} />
              ))}
            </div>
          ) : (
            <div className="demo-topic-groups">
              {groups.map(({ area, meta, items }) => {
                const isOpen = openArea === area.name;
                return (
                  <div key={area.name} className="demo-topic-group" data-open={isOpen}>
                    <button
                      type="button"
                      className="demo-topic-group-head"
                      aria-expanded={isOpen}
                      onClick={() => setOpenArea(isOpen ? null : area.name)}
                    >
                      <span className="demo-topic-group-title">
                        <span className="demo-topic-group-icon demo-topic-group-3d" aria-hidden="true">
                          <img src={meta.thumb} alt="" loading="lazy" decoding="async" />
                        </span>
                        <span>
                          <strong>{meta.label}</strong>
                          <span>{meta.prompt}</span>
                        </span>
                      </span>
                      <ChevronDown className="demo-topic-group-chevron" size={18} aria-hidden="true" />
                    </button>
                    {isOpen && (
                      <div className="demo-topic-group-panel">
                        <div className="demo-topic-assets-grid">
                          {items.map((engine) => (
                            <AssetCard key={engine.code} engine={engine} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
