import {
  ArrowRight,
  ChevronDown,
  Compass,
  Landmark,
  RefreshCw,
  Scale,
  Search,
  ShieldAlert,
  TrendingUp,
  Users,
  Wallet,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { SkeletonList } from '../../../shared/ui/Skeleton';
import type { EngineSummary } from '../hooks/useEngineCatalog';
import '../pages/engines-page.css';

/** The nine subject areas, each with its domain colour and what its tools help with. */
export const AREAS: { name: string; icon: LucideIcon; tone: string; helps: string }[] = [
  { name: 'Strategy', icon: Compass, tone: 'work', helps: 'Direction, alignment and priorities' },
  {
    name: 'Decisions',
    icon: Scale,
    tone: 'intelligence',
    helps: 'Frame, compare and time decisions',
  },
  { name: 'Operations', icon: Workflow, tone: 'work', helps: 'Flow, capacity and process health' },
  { name: 'Risk', icon: ShieldAlert, tone: 'risk', helps: 'Risks, continuity and early warnings' },
  {
    name: 'Governance',
    icon: Landmark,
    tone: 'account',
    helps: 'Controls, compliance, obligations',
  },
  { name: 'People', icon: Users, tone: 'talent', helps: 'Skills, succession and culture' },
  {
    name: 'Change',
    icon: RefreshCw,
    tone: 'opportunities',
    helps: 'Readiness and programme delivery',
  },
  { name: 'Growth', icon: TrendingUp, tone: 'opportunities', helps: 'Opportunities and roadmaps' },
  { name: 'Finance', icon: Wallet, tone: 'money', helps: 'Cash, ratios and valuation' },
];
export const areaOf = (name?: string) => AREAS.find((a) => a.name === name);

/** One tool row: name and method, what it does, cost, then the page's action. With `onOpen` the
 * whole row is the button; otherwise `action` supplies its own control (e.g. a demo popup). */
function ToolRow({
  engine,
  onOpen,
  action,
}: {
  engine: EngineSummary;
  onOpen?: (engine: EngineSummary) => void;
  action?: (engine: EngineSummary) => ReactNode;
}) {
  const body = (
    <>
      <span className="ws-tool-row-name">
        <strong>{engine.engineName}</strong>
        <small>{engine.standard ?? engine.seriesName}</small>
      </span>
      <span className="ws-tool-row-purpose">{engine.purpose}</span>
      <span className="ws-tool-row-cost">{engine.pointsCost} pts</span>
    </>
  );
  return (
    <li>
      {onOpen ? (
        <button type="button" className="ws-tool-row" onClick={() => onOpen(engine)}>
          {body}
          <span className="ws-tool-row-go">
            Open <ArrowRight size={14} aria-hidden="true" />
          </span>
        </button>
      ) : (
        <div className="ws-tool-row ws-tool-row-static">
          {body}
          <span className="ws-tool-row-action">{action?.(engine)}</span>
        </div>
      )}
    </li>
  );
}

/** The tool catalog: an area filter (All + each area) over one fixed-size card. In All, areas are
 * collapsed dropdowns (one open at a time; a search opens every match); a single area lists its
 * tools directly. Switching never changes the card's size or position. */
export function ToolCatalog({
  engines,
  onOpen,
  action,
  idPrefix = 'tools',
}: {
  /** null while loading. */
  engines: EngineSummary[] | null;
  onOpen?: (engine: EngineSummary) => void;
  action?: (engine: EngineSummary) => ReactNode;
  idPrefix?: string;
}) {
  const [area, setArea] = useState('All');
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const filtered = (engines ?? []).filter(
    (engine) =>
      !q ||
      `${engine.engineName} ${engine.standard ?? ''} ${engine.purpose} ${engine.area ?? ''}`
        .toLowerCase()
        .includes(q),
  );
  const groups = AREAS.map((a) => ({
    area: a,
    tools: filtered.filter((engine) => engine.area === a.name),
  })).filter((g) => g.tools.length > 0);
  const ungrouped = filtered.filter((engine) => !areaOf(engine.area));
  const activeArea = areaOf(area);
  const visible = area === 'All' ? filtered : filtered.filter((engine) => engine.area === area);
  const listId = `${idPrefix}-catalog-list`;
  const row = (engine: EngineSummary) => (
    <ToolRow key={engine.code} engine={engine} onOpen={onOpen} action={action} />
  );

  return (
    <section className="ws-catalog" data-tone={activeArea?.tone ?? 'intelligence'}>
      <div className="ws-catalog-filters" role="tablist" aria-label="Engine areas">
        {['All', ...AREAS.map((a) => a.name)].map((name) => {
          const meta = areaOf(name);
          const Icon = meta?.icon;
          const count =
            name === 'All'
              ? (engines?.length ?? 0)
              : (engines?.filter((e) => e.area === name).length ?? 0);
          return (
            <button
              key={name}
              type="button"
              role="tab"
              className="ws-catalog-filter"
              data-tone={meta?.tone}
              aria-selected={area === name}
              aria-controls={listId}
              onClick={() => setArea(name)}
            >
              {Icon && <Icon size={14} aria-hidden="true" />}
              {name}
              <span>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="ws-catalog-bar">
        <div className="ws-catalog-context">
          {activeArea ? (
            <>
              <span className="ws-section-icon" aria-hidden="true">
                <activeArea.icon size={18} />
              </span>
              <span>
                <strong>{activeArea.name}</strong>
                <small>{activeArea.helps}</small>
              </span>
            </>
          ) : (
            <span>
              <strong>All engines</strong>
              <small>Every area, from strategy to finance</small>
            </span>
          )}
        </div>
        <form role="search" className="ws-catalog-search" onSubmit={(e) => e.preventDefault()}>
          <Search size={15} aria-hidden="true" />
          <input
            type="search"
            aria-label="Search engines"
            placeholder="Search engines — e.g. cash, risk, OKR"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>
      </div>

      {/* Fixed-height body: switching area changes the content, never the card's size or place. */}
      <div className="ws-catalog-body" id={listId} role="tabpanel">
        {!engines ? (
          <SkeletonList rows={6} />
        ) : visible.length === 0 ? (
          <div className="ws-panel-state ws-empty">
            <Search size={26} aria-hidden="true" />
            <h2>No engines match</h2>
            <p>Try a broader word — for example cash, risk or OKR.</p>
          </div>
        ) : area === 'All' ? (
          <>
            {groups.map(({ area: a, tools }) => {
              const expanded = q !== '' || openGroup === a.name;
              const groupId = `${idPrefix}-${a.name.toLowerCase()}`;
              return (
                <div
                  className="ws-catalog-group"
                  key={a.name}
                  data-tone={a.tone}
                  data-open={expanded || undefined}
                >
                  <h2>
                    <button
                      type="button"
                      className="ws-catalog-toggle"
                      aria-expanded={expanded}
                      aria-controls={groupId}
                      onClick={() => setOpenGroup(openGroup === a.name ? null : a.name)}
                    >
                      <span className="ws-section-icon" aria-hidden="true">
                        <a.icon size={17} />
                      </span>
                      <span className="ws-section-title">
                        <strong>{a.name}</strong>
                        <small>{a.helps}</small>
                      </span>
                      <span className="ws-section-count">
                        {tools.length} {tools.length === 1 ? 'engine' : 'engines'}
                      </span>
                      <ChevronDown className="ws-section-chevron" size={18} aria-hidden="true" />
                    </button>
                  </h2>
                  {expanded && (
                    <ul className="ws-tool-rows" id={groupId}>
                      {tools.map(row)}
                    </ul>
                  )}
                </div>
              );
            })}
            {ungrouped.length > 0 && (
              <div className="ws-catalog-group">
                <h2>Other engines</h2>
                <ul className="ws-tool-rows">{ungrouped.map(row)}</ul>
              </div>
            )}
          </>
        ) : (
          <ul className="ws-tool-rows">{visible.map(row)}</ul>
        )}
      </div>
    </section>
  );
}
