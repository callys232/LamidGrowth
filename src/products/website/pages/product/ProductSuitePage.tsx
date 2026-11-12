import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowUpNarrowWide,
  BadgeCheck,
  ChartNoAxesColumnIncreasing,
  ChartNoAxesCombined,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  ClipboardList,
  Compass,
  Cpu,
  FileCheck,
  Gauge,
  GitBranch,
  GitCompareArrows,
  Layers,
  Lock,
  Network,
  PieChart,
  Scale,
  ScanSearch,
  Search,
  SearchCheck,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Sparkles,
  Sprout,
  Target,
  TrendingUp,
  UserCheck,
  UserRoundSearch,
  Users,
  UsersRound,
  Wallet,
  WalletCards,
  Waypoints,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import './product.css';
import './product-showcase.css';
import './product-suite.css';
import '../motion.css';
import { SuiteInteractiveWidget } from './interactive/SuiteInteractiveWidget';
import { SuiteHeroDispatcher } from './heroes/SuiteHeroDispatcher';

export interface ProductEngineItem {
  code: string;
  name: string;
  standard?: string;
  computes: string;
  purpose: string;
  icon?: LucideIcon;
  tags?: string[];
}

export interface ProductSuiteConfig {
  id: string;
  name: string;
  eyebrow: string;
  pillar: 'clarity' | 'capability' | 'growth' | 'consistency';
  title: string;
  lede: string;
  statement: string;
  tags: string[];
  clip: string;
  clipPoster?: string;
  thesis: {
    headline: string;
    description: string;
  };
  engines: ProductEngineItem[];
  advisoryHighlight?: {
    title: string;
    points: string[];
  };
}

const defaultIcons: Record<string, LucideIcon> = {
  S01: Compass,
  S03: GitCompareArrows,
  S09: ArrowUpNarrowWide,
  S06: Target,
  S07: ScanSearch,
  C06: Layers,
  Q44: ClipboardCheck,
  Q02: ClipboardList,
  Q29: Network,
  Q21: Scale,
  Q03: ChartNoAxesCombined,
  Q05: Gauge,
  Q06: ShieldAlert,
  Q17: Users,
  S08: GitBranch,
  Q35: Waypoints,
  Q58: CheckCircle2,
  Q27: SearchCheck,
  A05: Sparkles,
  A02: UserRoundSearch,
  A03: UsersRound,
  A22: BadgeCheck,
  A07: Activity,
  A09: Layers,
  A11: Users,
  A15: TrendingUp,
  A23: CheckCircle2,
  A25: Target,
  R02: Activity,
  R03: Gauge,
  R06: GitBranch,
  R05: Workflow,
  P14: ScanSearch,
  R25: SearchCheck,
  S05: ClipboardList,
  P10: TrendingUp,
  Q39: Network,
  P24: Cpu,
  P25: Sprout,
  R26: CheckCircle2,
  F01: PieChart,
  F02: WalletCards,
  F03: ChartNoAxesColumnIncreasing,
  F04: SearchCheck,
  F05: Wallet,
  F07: BadgeCheck,
  Q15: Siren,
  Q43: ShieldAlert,
  Q86: Shield,
  X02: Lock,
  X06: ShieldCheck,
  Q99: ClipboardCheck,
  Q76: ClipboardList,
  X04: CheckCircle2,
  X05: UserCheck,
  F06: FileCheck,
  C08: GitBranch,
  Z06: Target,
  Z01: TrendingUp,
  G03: Waypoints,
  G07: Scale,
  G04: Layers,
  G06: Cpu,
};

function playVideo(event: { currentTarget: HTMLElement }) {
  const video = event.currentTarget.querySelector('video');
  if (video) {
    video.playbackRate = 0.65;
    if (video.paused) void video.play().catch(() => undefined);
  }
}

export function ProductSuitePage({ config }: { config: ProductSuiteConfig }) {
  const [activeEngineCode, setActiveEngineCode] = useState<string>(config.engines[0]?.code || '');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const activeEngine = config.engines.find((e) => e.code === activeEngineCode) || config.engines[0];

  useEffect(() => {
    document.title = `${config.title} | LAMID ONE`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', config.lede);
  }, [config]);

  const filteredEngines = config.engines.filter((engine) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      engine.code.toLowerCase().includes(term) ||
      engine.name.toLowerCase().includes(term) ||
      (engine.standard && engine.standard.toLowerCase().includes(term)) ||
      engine.computes.toLowerCase().includes(term)
    );
  });

  const catalogHeading = config.name.toLowerCase().includes('decision')
    ? `The Complete ${config.name} Suite`
    : `The Complete ${config.name} Decision Suite`;

  return (
    <div className="prod-page product-suite-page" data-suite-pillar={config.pillar}>
      {/* 1. Bespoke Hero Slide Dispatcher (8 Unique Architectural Patterns) */}
      <SuiteHeroDispatcher config={config} />

      {/* 2. Interactive Video Showcase Block */}
      <section className="ps-block suite-showcase-block" aria-labelledby="suite-showcase-title">
        <div className="ps-block-row">
          <div
            className="ps-visual suite-visual"
            onMouseEnter={playVideo}
            onFocus={playVideo}
            tabIndex={0}
          >
            <video
              muted
              loop
              playsInline
              preload="none"
              poster={config.clipPoster || `/media/posters/${config.clip}.svg`}
              aria-label={`${config.name} engine in operation`}
              onLoadedMetadata={(e) => {
                e.currentTarget.playbackRate = 0.65;
              }}
              onPlay={(e) => {
                e.currentTarget.playbackRate = 0.65;
              }}
            >
              <source src={`/videos/engines/${config.clip}.webm`} type="video/webm" />
              <source src={`/videos/engines/${config.clip}.mp4`} type="video/mp4" />
            </video>
            <div className="suite-visual-overlay">
              <span className="suite-live-badge">Live Computational Engine</span>
            </div>
          </div>
          <div className="ps-text suite-thesis-text">
            <h2 id="suite-showcase-title">{config.thesis.headline}</h2>
            <p className="suite-thesis-desc">{config.thesis.description}</p>
            <Link className="suite-demo-link" to="/demo">
              Launch interactive sandbox &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* 2.5 Bespoke Interactive Simulator Widget (Pillar-Specific Micro-Interactions) */}
      <SuiteInteractiveWidget config={config} />

      {/* 3. Comprehensive Engine Catalog Section */}
      <section className="suite-catalog-section" aria-labelledby="suite-catalog-title">
        <div className="suite-catalog-header">
          <span className="ps-tag">Decision Engines</span>
          <h2 id="suite-catalog-title">{catalogHeading}</h2>
          <p>
            Choose an engine below to test its math against your numbers. Inspect formulas,
            assumptions, and audit trails upfront.
          </p>
        </div>

        {/* Selected Engine Inspector Console */}
        {activeEngine && (
          <div
            className="suite-engine-inspector"
            role="region"
            aria-label="Selected Engine Telemetry"
          >
            <div className="suite-inspector-header">
              <div className="suite-inspector-title-row">
                <span className="suite-inspector-badge">{activeEngine.code}</span>
                <div>
                  <h3 className="suite-inspector-name">{activeEngine.name}</h3>
                  {activeEngine.standard && (
                    <span className="suite-inspector-standard">{activeEngine.standard}</span>
                  )}
                </div>
              </div>
              <Link
                to={`/demo#engine-${activeEngine.code}`}
                className="suite-inspector-btn"
                title={`Launch ${activeEngine.name} in interactive sandbox`}
              >
                Launch Live in Sandbox <ChevronRight size={14} aria-hidden="true" />
              </Link>
            </div>
            <div className="suite-inspector-grid">
              <div className="suite-inspector-card">
                <span className="suite-inspector-lbl">What It Computes For You</span>
                <p className="suite-inspector-val">{activeEngine.computes}</p>
              </div>
              <div className="suite-inspector-card">
                <span className="suite-inspector-lbl">What Problem It Solves</span>
                <p className="suite-inspector-val">{activeEngine.purpose}</p>
              </div>
            </div>
          </div>
        )}

        {/* Instant Search / Filter Toolbar */}
        <div className="suite-catalog-toolbar">
          <div className="suite-search-input-wrap">
            <Search size={18} aria-hidden="true" />
            <input
              type="text"
              className="suite-search-input"
              placeholder={`Search ${config.name} engines by name, code (e.g. ${config.engines[0]?.code || 'Q01'}), or standard...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label={`Search ${config.name} decision engines`}
            />
          </div>
        </div>

        <div className="suite-engine-grid">
          {filteredEngines.map((engine) => {
            const Icon = engine.icon || defaultIcons[engine.code] || CircleHelp;
            const isSelected = activeEngine?.code === engine.code;
            return (
              <article
                key={engine.code}
                className={`suite-engine-card ${isSelected ? 'is-selected' : ''}`}
                onClick={() => setActiveEngineCode(engine.code)}
              >
                <div className="suite-engine-card-top">
                  <span className="suite-engine-code-badge">{engine.code}</span>
                  <div className="suite-engine-icon-wrap" aria-hidden="true">
                    <Icon size={19} strokeWidth={1.8} />
                  </div>
                </div>
                <h3 className="suite-engine-name">{engine.name}</h3>
                {engine.standard && (
                  <span className="suite-engine-standard-badge" title={engine.standard}>
                    {engine.standard}
                  </span>
                )}
                <div className="suite-engine-computes-wrap">
                  <span className="suite-engine-computes-label">Computes</span>
                  <p className="suite-engine-computes">{engine.computes}</p>
                </div>
                <div className="suite-engine-card-foot">
                  <Link
                    to={`/demo#engine-${engine.code}`}
                    className="suite-engine-run-link"
                    title={`Run ${engine.name} in interactive sandbox`}
                  >
                    Run in Sandbox <ChevronRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 4. Advisory & Executive Delivery Alignment */}
      {config.advisoryHighlight ? (
        <section className="suite-advisory-block" aria-labelledby="suite-advisory-title">
          <div className="suite-advisory-inner">
            <div className="suite-advisory-header">
              <span className="ps-tag">Executive Collaboration</span>
              <h2 id="suite-advisory-title">{config.advisoryHighlight.title}</h2>
              <p>
                Our engines compute the evidence. You and our vetted fractional leaders decide what
                happens next.
              </p>
            </div>
            <ul className="suite-advisory-points">
              {config.advisoryHighlight.points.map((pt, idx) => (
                <li key={idx}>
                  <CheckCircle2 size={18} className="suite-point-check" aria-hidden="true" />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* 5. Closing CTA */}
      <section className="prod-close suite-close">
        <h2>Put {config.name} to work in your organization today.</h2>
        <p className="suite-close-sub">
          Continuous intelligence that moves with your work—giving you the evidence to decide and deliver.
        </p>
        <div className="prod-actions">
          <Link className="prod-btn prod-btn-light" to="/contact">
            Request an Executive Demo
          </Link>
          <Link className="prod-btn prod-btn-ghost" to="/pricing">
            Review Pricing & Tiers
          </Link>
        </div>
      </section>
    </div>
  );
}
