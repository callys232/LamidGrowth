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
  Download,
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
import { SuiteDashboardShowcase } from './dashboards/SuiteDashboardShowcase';
import {
  EngineVectorSchematic,
  EngineVectorThumb,
  getCardPattern,
  getCardShade,
} from './EngineVectorArt';
import { Modal } from '../../../../shared/ui/Modal';
import {
  getEngineGuide,
  getSuiteUseCases,
  suitePlaybooks,
  type SuitePlaybookSummary,
} from './suitePlaybooksAndUseCases';

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

const suite3dPools: Record<string, string[]> = {
  strategy: [
    '/media/suites/strategy-3d.jpg',
    '/media/suites/decisions-3d.jpg',
    '/media/hero/pillar-01-decisions.jpg',
    '/media/suites/growth-change-3d.jpg',
  ],
  decisions: [
    '/media/suites/decisions-3d.jpg',
    '/media/hero/pillar-01-decisions.jpg',
    '/media/hero/pillar-01-decisions-b.jpg',
    '/media/suites/strategy-3d.jpg',
  ],
  people: [
    '/media/suites/people-3d.jpg',
    '/media/hero/pillar-02-capabilities.jpg',
    '/media/suites/operations-3d.jpg',
    '/media/suites/advisory-3d.jpg',
  ],
  operations: [
    '/media/suites/operations-3d.jpg',
    '/media/hero/pillar-02-capabilities-b.jpg',
    '/media/suites/people-3d.jpg',
    '/media/hero/pillar-02-capabilities.jpg',
  ],
  finance: [
    '/media/suites/finance-3d.jpg',
    '/media/hero/pillar-03-growth.jpg',
    '/media/suites/growth-change-3d.jpg',
    '/media/hero/pillar-03-growth-b.jpg',
  ],
  'growth-change': [
    '/media/suites/growth-change-3d.jpg',
    '/media/hero/pillar-03-growth-b.jpg',
    '/media/suites/finance-3d.jpg',
    '/media/hero/pillar-03-growth.jpg',
  ],
  'risk-governance': [
    '/media/suites/risk-governance-3d.jpg',
    '/media/suites/advisory-3d.jpg',
    '/media/suites/decisions-3d.jpg',
    '/media/suites/operations-3d.jpg',
  ],
  advisory: [
    '/media/suites/advisory-3d.jpg',
    '/media/suites/risk-governance-3d.jpg',
    '/media/suites/strategy-3d.jpg',
    '/media/suites/people-3d.jpg',
  ],
};

function getEngine3dThumb(suiteId: string, idx: number): string {
  const pool = suite3dPools[suiteId] || suite3dPools.strategy;
  return pool[idx % pool.length];
}

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
  const [activePlaybook, setActivePlaybook] = useState<SuitePlaybookSummary | null>(null);
  const activeEngine = config.engines.find((e) => e.code === activeEngineCode) || config.engines[0];

  const downloadSuiteTemplate = (pb: SuitePlaybookSummary) => {
    const matchedEngines = config.engines.filter((e) => pb.engineCodes.includes(e.code));
    const lines = [
      `# ${pb.title}`,
      '',
      pb.description,
      `Cadence: ${pb.cadence}`,
      '',
      'Review date: __________',
      'Owner: __________',
      'Question to answer: __________',
    ];
    for (const eng of matchedEngines) {
      const guide = getEngineGuide(eng);
      lines.push(
        '',
        `## ${eng.name}`,
        eng.purpose,
        '',
        '### Steps',
        ...guide.playbookSteps.map((s, i) => `${i + 1}. ${s}`),
        '',
        'Result / observation: __________',
        'Next action and owner: __________',
      );
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${pb.id}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

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

  const suiteExplorerSubtitle: Record<string, string> = {
    strategy: 'Pick a check to see which projects create value and which create drag.',
    decisions: 'Pick a decision check to see how teams align faster without bottlenecks.',
    people: 'Pick a role check to see how skills adapt as priorities shift.',
    operations: 'Pick a flow check to spot where handoffs stall across teams.',
    finance: 'Pick a financial check to link daily choices to cash and margin.',
    'risk-governance': 'Pick a control check to keep autonomous teams inside safe limits.',
    'growth-change': 'Pick a readiness check to see what your teams can absorb next.',
    advisory: 'Pick a mandate model to add senior judgment inside your workflow.',
  };

  const suiteClosingHeadline: Record<string, string> = {
    strategy: 'Stop funding busywork. Fund what moves your goals.',
    decisions: 'Make faster calls without routing everything to the top.',
    people: 'Build a team that adapts as fast as your market.',
    operations: 'Clear handoff friction so teams deliver together.',
    finance: 'See every cash dip and margin lever weeks ahead.',
    'risk-governance': 'Give teams room to move inside clear guardrails.',
    'growth-change': 'Scale your next bet without burning out your people.',
    advisory: 'Bring senior judgment directly into your live decisions.',
  };

  const activeGuide = activeEngine ? getEngineGuide(activeEngine) : null;
  const playbooksForSuite = suitePlaybooks[config.id] || [];
  const useCasesForSuite = getSuiteUseCases(
    config.id,
    config.engines.length > 3 ? config.engines.slice(1) : config.engines,
  ).slice(0, 2);

  return (
    <div className="prod-page product-suite-page" data-suite-pillar={config.pillar}>
      {/* 1. Bespoke Hero Slide Dispatcher (8 Unique Architectural Patterns) */}
      <SuiteHeroDispatcher config={config} />

      {/* 2. Populated Dashboard Asset Showing Live Usage */}
      <SuiteDashboardShowcase config={config} />

      {/* 3. Engines Intro + Split Explorer */}
      <section className="suite-catalog-section" aria-labelledby="suite-catalog-title">
        <div className="suite-catalog-header">
          <h2 id="suite-catalog-title">{catalogHeading}</h2>
          <p>{suiteExplorerSubtitle[config.id] || 'Pick an engine to see what it checks and how to run it.'}</p>
        </div>

        <div className="suite-catalog-toolbar">
          <div className="suite-search-input-wrap">
            <Search size={18} aria-hidden="true" />
            <input
              type="text"
              className="suite-search-input"
              placeholder={`Search ${config.name} engines...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label={`Search ${config.name} decision engines`}
            />
          </div>
        </div>

        <div className="suite-explorer-split">
          <div className="suite-engine-list" role="list" aria-label={`${config.name} engines`}>
            {filteredEngines.map((engine, idx) => {
              const Icon = engine.icon || defaultIcons[engine.code] || CircleHelp;
              const isSelected = activeEngine?.code === engine.code;
              const shade = getCardShade(idx);
              const pattern = getCardPattern(idx);
              return (
                <article
                  key={engine.code}
                  data-shade={shade}
                  data-pattern={pattern}
                  className={`suite-engine-card suite-engine-row ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => setActiveEngineCode(engine.code)}
                >
                  <div className="suite-engine-row-head">
                    <EngineVectorThumb code={engine.code} index={idx} />
                    <div className="suite-engine-row-title">
                      <h3 className="suite-engine-name">{engine.name}</h3>
                    </div>
                    <Icon size={16} className="suite-engine-row-chevron" aria-hidden="true" />
                  </div>
                </article>
              );
            })}
          </div>

          {activeEngine && activeGuide && (() => {
            const activeIdx = Math.max(
              0,
              config.engines.findIndex((e) => e.code === activeEngine.code),
            );
            const activeShade = getCardShade(activeIdx);
            const activePattern = getCardPattern(activeIdx);
            return (
              <div
                key={activeEngine.code}
                data-shade={activeShade}
                data-pattern={activePattern}
                className="suite-engine-inspector suite-engine-inspector-sticky"
                role="region"
                aria-label="Selected Engine Details"
              >
                <div className="suite-inspector-header">
                  <div className="suite-inspector-title-row">
                    <EngineVectorThumb code={activeEngine.code} index={activeIdx} />
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
                    Run Live Demo <ChevronRight size={14} aria-hidden="true" />
                  </Link>
                </div>

                <EngineVectorSchematic engine={activeEngine} index={activeIdx} />

              <div className="suite-inspector-card">
                <span className="suite-inspector-lbl">What it checks</span>
                <p className="suite-inspector-val">{activeEngine.purpose}</p>
              </div>

              <div className="suite-inspector-example">
                <span className="suite-inspector-lbl">Example</span>
                <div className="suite-example-grid">
                  <div>
                    <strong>You bring:</strong> {activeGuide.sampleRun.inputs}
                  </div>
                  <div>
                    <strong>You see:</strong> {activeGuide.sampleRun.output}
                  </div>
                </div>
              </div>

              <div className="suite-inspector-playbook">
                <div className="suite-inspector-pb-head">
                  <span className="suite-inspector-lbl">Steps</span>
                  <span className="suite-cadence-pill">{activeGuide.cadence}</span>
                </div>
                <ol className="suite-pb-steps" data-scroll-feedback="off">
                  {activeGuide.playbookSteps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>
            );
          })()}
        </div>
      </section>

      {/* 3.5 Interactive Simulator */}
      <SuiteInteractiveWidget config={config} />

      {/* 4. Playbooks & Use Cases */}
      <section className="suite-library-section" aria-labelledby="suite-library-title">
        <div className="suite-library-header">
          <div>
            <h2 id="suite-library-title">Put {config.name} into weekly practice</h2>
          </div>
          <Link className="suite-demo-link" to="/insights#playbook-library">
            Browse all playbooks &rarr;
          </Link>
        </div>

        <div className="suite-library-grid">
          {playbooksForSuite.map((pb, pbIdx) => (
            <article
              key={pb.id}
              className="suite-pb-card"
              data-category={pb.category}
            >
              <div className="suite-pb-card-media" aria-hidden="true">
                <img
                  src={getEngine3dThumb(config.id, pbIdx)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
                <span className="suite-pb-phase-count">
                  {pb.engineCodes.length} Phases · {pb.cadence}
                </span>
              </div>
              <span className="suite-pb-kicker">{pb.category}</span>
              <h3>{pb.title}</h3>
              <p>{pb.description}</p>
              <div className="suite-pb-actions">
                <button
                  type="button"
                  className="suite-pb-btn-solid"
                  onClick={() => setActivePlaybook(pb)}
                >
                  View playbook
                </button>
                <button
                  type="button"
                  className="suite-pb-btn-outline"
                  onClick={() => downloadSuiteTemplate(pb)}
                >
                  <Download size={15} aria-hidden="true" />
                  Template
                </button>
              </div>
            </article>
          ))}

          {useCasesForSuite.map((uc) => (
            <article key={uc.id} className="suite-lib-card suite-lib-usecase">
              <div className="suite-lib-meta">
                <span className="suite-lib-type">{uc.role}</span>
              </div>
              <h3>{uc.title}</h3>
              <p>{uc.scenario}</p>
              <p className="suite-lib-outcome">
                <strong>Result:</strong> {uc.outcome}
              </p>
            </article>
          ))}
        </div>

        {activePlaybook && (() => {
          const matchedEngines = config.engines.filter((e) =>
            activePlaybook.engineCodes.includes(e.code),
          );
          const leadGuide = matchedEngines[0] ? getEngineGuide(matchedEngines[0]) : null;
          return (
            <Modal title={activePlaybook.title} onClose={() => setActivePlaybook(null)} wide>
              <div className="suite-pb-modal" data-suite-pillar={config.pillar}>
                {/* Executive Banner with 3D Visual + Vector Architecture */}
                <div className="suite-pb-hero">
                  <div className="suite-pb-hero-copy">
                    <div className="suite-pb-hero-badges">
                      <span className="suite-pb-badge">{activePlaybook.category}</span>
                      <span className="suite-pb-badge is-outline">{activePlaybook.cadence}</span>
                      <span className="suite-pb-badge is-outline">
                        {matchedEngines.length} Sequential Phases
                      </span>
                    </div>
                    <p className="suite-pb-modal-desc">{activePlaybook.description}</p>
                    <div className="suite-pb-gov-grid">
                      <div>
                        <span>Lead Role</span>
                        <strong>{leadGuide?.useCase.role || 'Executive Sponsor'}</strong>
                      </div>
                      <div>
                        <span>Sign-Off Gate</span>
                        <strong>Board / IC Review</strong>
                      </div>
                      <div>
                        <span>Audit Trail</span>
                        <strong>Inputs + Math Logged</strong>
                      </div>
                      <div>
                        <span>Suite</span>
                        <strong>{config.name}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="suite-pb-hero-art" aria-hidden="true">
                    <img
                      src={getEngine3dThumb(config.id, 0)}
                      alt=""
                      loading="eager"
                      decoding="async"
                    />
                    <svg className="suite-pb-vector-flow" viewBox="0 0 180 44" fill="none">
                      <rect x="4" y="10" width="38" height="24" rx="6" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M46 22H68" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                      <polygon points="90,6 112,22 90,38 68,22" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M114 22H136" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                      <rect x="138" y="10" width="38" height="24" rx="6" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </div>
                </div>

                {/* Pre-Flight Readiness & Data Inputs */}
                <div className="suite-pb-prereqs">
                  <span className="suite-pb-section-lbl">Pre-Flight Data Requirements</span>
                  <div className="suite-pb-prereq-chips">
                    {matchedEngines.map((eng) => {
                      const guide = getEngineGuide(eng);
                      return (
                        <div key={eng.code} className="suite-pb-prereq-chip">
                          <strong>{eng.name}</strong>
                          <span>{guide.sampleRun.inputs}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Institutional Phase-by-Phase Protocol */}
                <ol className="suite-pb-phases" data-scroll-feedback="off">
                  {matchedEngines.map((eng, idx) => {
                    const guide = getEngineGuide(eng);
                    return (
                      <li key={eng.code} className="suite-pb-phase-card">
                        <div className="suite-pb-phase-head">
                          <div className="suite-pb-phase-id">
                            <div className="suite-pb-phase-3d" aria-hidden="true">
                              <img
                                src={getEngine3dThumb(config.id, idx)}
                                alt=""
                                loading="lazy"
                                decoding="async"
                              />
                            </div>
                            <div>
                              <span className="suite-pb-phase-num">
                                Phase 0{idx + 1} · {guide.cadence}
                              </span>
                              <h4>{eng.name}</h4>
                              {eng.standard && (
                                <span className="suite-pb-phase-std">{eng.standard}</span>
                              )}
                            </div>
                          </div>
                          <span className="suite-pb-role-pill">{guide.useCase.role}</span>
                        </div>

                        <p className="suite-pb-phase-purpose">{eng.purpose}</p>

                        <div className="suite-pb-phase-grid">
                          <div className="suite-pb-phase-box">
                            <span className="suite-pb-box-lbl">1. Inputs Required</span>
                            <p>{guide.sampleRun.inputs}</p>
                          </div>
                          <div className="suite-pb-phase-box is-protocol">
                            <span className="suite-pb-box-lbl">2. Execution Protocol</span>
                            <ol data-scroll-feedback="off">
                              {guide.playbookSteps.map((step, i) => (
                                <li key={i}>{step}</li>
                              ))}
                            </ol>
                          </div>
                          <div className="suite-pb-phase-box is-output">
                            <span className="suite-pb-box-lbl">3. Verified Output &amp; Gate</span>
                            <p>{guide.sampleRun.output}</p>
                            <small>Result: {guide.useCase.outcome}</small>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>

                <div className="suite-pb-modal-foot">
                  <Link className="suite-pb-btn-outline" to="/demo">
                    Open live sandbox
                  </Link>
                  <button
                    type="button"
                    className="suite-pb-btn-solid"
                    onClick={() => downloadSuiteTemplate(activePlaybook)}
                  >
                    <Download size={15} aria-hidden="true" />
                    Download institutional template
                  </button>
                </div>
              </div>
            </Modal>
          );
        })()}
      </section>

      {/* 5. Suite Assets & Motion Walkthrough */}
      <section className="suite-assets-section" aria-labelledby="suite-assets-title">
        <div className="suite-assets-grid">
          <div
            className="ps-visual suite-visual"
            onMouseEnter={playVideo}
            onFocus={playVideo}
            tabIndex={0}
          >
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster={config.clipPoster || `/media/posters/${config.clip}.svg`}
              aria-label={`${config.name} engine in operation`}
              onLoadedMetadata={(e) => {
                e.currentTarget.playbackRate = 0.6;
              }}
              onPlay={(e) => {
                e.currentTarget.playbackRate = 0.6;
              }}
            >
              <source src={`/videos/engines/${config.clip}.webm`} type="video/webm" />
              <source src={`/videos/engines/${config.clip}.mp4`} type="video/mp4" />
            </video>
          </div>

          <div className="suite-assets-copy">
            <h2 id="suite-assets-title">Clear math you can check.</h2>
            <p>You see every input, assumption, and limit behind every score.</p>
            <Link className="suite-demo-link" to="/demo">
              Try a live check in Sandbox &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* 6. Advisory & Executive Delivery Alignment */}
      {config.advisoryHighlight ? (
        <section className="suite-advisory-block" aria-labelledby="suite-advisory-title">
          <div className="suite-advisory-inner">
            <div className="suite-advisory-header">
              <h2 id="suite-advisory-title">{config.advisoryHighlight.title}</h2>
              <p>You review the numbers, set the direction, and decide what comes next with your adviser.</p>
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

      {/* 7. Closing Slide */}
      <section className="prod-close suite-close">
        <h2>{suiteClosingHeadline[config.id] || `Try ${config.name} on your own work.`}</h2>
        <p className="suite-close-sub">
          You keep full control—with live checks and human advisers whenever you want them.
        </p>
        <div className="prod-actions">
          <Link className="prod-btn prod-btn-light" to="/demo">
            Get a demo
          </Link>
          <Link className="prod-btn prod-btn-ghost" to="/pricing">
            See pricing
          </Link>
        </div>
      </section>
    </div>
  );
}
