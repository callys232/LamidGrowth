import type { ReactNode } from 'react';
import './audience-context-illustration.css';

interface SceneMeta {
  kicker: string;
  title: string;
  render: () => ReactNode;
}

const SCENES: Record<string, SceneMeta> = {
  individuals: {
    kicker: 'Personal Clarity',
    title: 'Competing priorities → one calm timeline',
    render: () => (
      <div className="aud-3d-stage aud-scene-individuals">
        <div className="aud-3d-back-card">
          <span>Weekly Rhythm</span>
          <div className="aud-mini-bars">
            <i style={{ width: '78%' }} />
            <i style={{ width: '54%' }} />
            <i style={{ width: '92%' }} />
          </div>
        </div>
        <div className="aud-3d-main-card">
          <svg className="aud-vec" viewBox="0 0 260 110" aria-hidden="true">
            <path className="aud-flow-line" d="M22 24 C 86 24, 96 55, 134 55" />
            <path className="aud-flow-line aud-delay-1" d="M22 55 L 134 55" />
            <path className="aud-flow-line aud-delay-2" d="M22 86 C 86 86, 96 55, 134 55" />
            <path className="aud-flow-line aud-flow-strong" d="M134 55 L 236 55" />
            <circle cx="22" cy="24" r="5" className="aud-dot-muted" />
            <circle cx="22" cy="55" r="5" className="aud-dot-muted" />
            <circle cx="22" cy="86" r="5" className="aud-dot-muted" />
            <circle cx="134" cy="55" r="9" className="aud-dot-accent aud-pulse" />
            <circle cx="236" cy="55" r="7" className="aud-dot-teal" />
          </svg>
          <div className="aud-chip-row">
            <span className="aud-chip">3 priorities</span>
            <span className="aud-chip is-accent">1 clear focus</span>
          </div>
        </div>
      </div>
    ),
  },
  professionals: {
    kicker: 'Capability Path',
    title: 'Current role → next stage readiness',
    render: () => (
      <div className="aud-3d-stage aud-scene-professionals">
        <div className="aud-3d-back-card">
          <span>Skill Trajectory</span>
          <strong>Next Role Ready</strong>
        </div>
        <div className="aud-3d-main-card">
          <svg className="aud-vec" viewBox="0 0 260 116" aria-hidden="true">
            <defs>
              <linearGradient id="aud-prof-grad" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path d="M20 96 C 85 92, 120 56, 236 22 L 236 96 Z" fill="url(#aud-prof-grad)" />
            <path className="aud-flow-line aud-flow-strong" d="M20 96 C 85 92, 120 56, 236 22" />
            <circle cx="26" cy="94" r="6" className="aud-dot-muted" />
            <circle cx="126" cy="60" r="7" className="aud-dot-accent aud-pulse" />
            <circle cx="232" cy="24" r="8" className="aud-dot-teal" />
          </svg>
          <div className="aud-chip-row">
            <span className="aud-chip">Current</span>
            <span className="aud-chip is-accent">Gap Closed</span>
            <span className="aud-chip">Next Stage</span>
          </div>
        </div>
      </div>
    ),
  },
  creators: {
    kicker: 'Studio + Business',
    title: 'Creative craft backed by clear pricing & plans',
    render: () => (
      <div className="aud-3d-stage aud-scene-creators">
        <div className="aud-3d-back-card">
          <span>Offer & Margin</span>
          <div className="aud-mini-bars">
            <i style={{ width: '88%' }} />
            <i style={{ width: '68%' }} />
          </div>
        </div>
        <div className="aud-3d-main-card">
          <svg className="aud-vec" viewBox="0 0 260 110" aria-hidden="true">
            <rect x="20" y="20" width="92" height="68" rx="12" className="aud-wire-box" />
            <path className="aud-flow-line aud-flow-strong" d="M36 66 Q 66 28, 96 58" />
            <circle cx="66" cy="40" r="5" className="aud-dot-accent aud-pulse" />
            <rect x="136" y="20" width="104" height="18" rx="6" className="aud-wire-bar" />
            <rect x="136" y="46" width="84" height="18" rx="6" className="aud-wire-bar is-fill" />
            <rect x="136" y="72" width="64" height="18" rx="6" className="aud-wire-bar" />
          </svg>
          <div className="aud-chip-row">
            <span className="aud-chip">Craft</span>
            <span className="aud-chip is-accent">Pricing</span>
            <span className="aud-chip">Pipeline</span>
          </div>
        </div>
      </div>
    ),
  },
  founders: {
    kicker: 'Scenario Modeling',
    title: 'Runway, cash flow & transparent assumptions',
    render: () => (
      <div className="aud-3d-stage aud-scene-founders">
        <div className="aud-3d-back-card">
          <span>Assumptions</span>
          <strong>3 Scenarios</strong>
        </div>
        <div className="aud-3d-main-card">
          <svg className="aud-vec" viewBox="0 0 260 112" aria-hidden="true">
            <path className="aud-flow-line aud-flow-strong" d="M24 84 C 90 76, 150 42, 236 20" />
            <path className="aud-flow-line aud-delay-1" d="M24 84 C 95 78, 155 62, 236 52" />
            <path className="aud-flow-line aud-delay-2" d="M24 84 C 100 84, 160 88, 236 88" />
            <circle cx="24" cy="84" r="6" className="aud-dot-accent" />
            <circle cx="236" cy="20" r="6" className="aud-dot-teal aud-pulse" />
            <circle cx="236" cy="52" r="5" className="aud-dot-accent" />
            <circle cx="236" cy="88" r="5" className="aud-dot-muted" />
          </svg>
          <div className="aud-chip-row">
            <span className="aud-chip is-accent">Upside</span>
            <span className="aud-chip">Base</span>
            <span className="aud-chip">Runway Floor</span>
          </div>
        </div>
      </div>
    ),
  },
  teams: {
    kicker: 'Shared Rhythm',
    title: 'Priorities, blockers & owners in sync',
    render: () => (
      <div className="aud-3d-stage aud-scene-teams">
        <div className="aud-3d-back-card">
          <span>Team Cadence</span>
          <strong>Aligned Weekly</strong>
        </div>
        <div className="aud-3d-main-card">
          <svg className="aud-vec" viewBox="0 0 260 112" aria-hidden="true">
            <circle cx="130" cy="56" r="38" className="aud-wire-ring" />
            <path className="aud-flow-line aud-flow-strong" d="M56 56 L 130 22 L 204 56 L 130 90 Z" />
            <circle cx="56" cy="56" r="8" className="aud-dot-teal aud-pulse" />
            <circle cx="130" cy="22" r="8" className="aud-dot-accent" />
            <circle cx="204" cy="56" r="8" className="aud-dot-teal aud-pulse" />
            <circle cx="130" cy="90" r="8" className="aud-dot-muted" />
          </svg>
          <div className="aud-chip-row">
            <span className="aud-chip">Priorities</span>
            <span className="aud-chip is-accent">Blockers</span>
            <span className="aud-chip">Owners</span>
          </div>
        </div>
      </div>
    ),
  },
  smes: {
    kicker: 'Flow & Margin',
    title: 'Clear bottlenecks → steady operating margin',
    render: () => (
      <div className="aud-3d-stage aud-scene-smes">
        <div className="aud-3d-back-card">
          <span>Throughput</span>
          <strong>Bottleneck Cleared</strong>
        </div>
        <div className="aud-3d-main-card">
          <svg className="aud-vec" viewBox="0 0 260 112" aria-hidden="true">
            <rect x="22" y="36" width="46" height="40" rx="10" className="aud-wire-box" />
            <rect x="106" y="42" width="48" height="28" rx="8" className="aud-wire-box is-active" />
            <rect x="192" y="30" width="46" height="52" rx="10" className="aud-wire-box" />
            <path className="aud-flow-line aud-flow-strong" d="M68 56 L 106 56 M154 56 L 192 56" />
            <circle cx="130" cy="56" r="6" className="aud-dot-accent aud-pulse" />
            <circle cx="215" cy="56" r="6" className="aud-dot-teal" />
          </svg>
          <div className="aud-chip-row">
            <span className="aud-chip">Inputs</span>
            <span className="aud-chip is-accent">Fix Constraint</span>
            <span className="aud-chip">Margin</span>
          </div>
        </div>
      </div>
    ),
  },
  organisations: {
    kicker: 'Scale & Control',
    title: 'Strategy, capability & clear accountability',
    render: () => (
      <div className="aud-3d-stage aud-scene-organisations">
        <div className="aud-3d-back-card">
          <span>Governance</span>
          <strong>Clear Boundaries</strong>
        </div>
        <div className="aud-3d-main-card">
          <svg className="aud-vec" viewBox="0 0 260 112" aria-hidden="true">
            <rect x="92" y="14" width="76" height="24" rx="7" className="aud-wire-box is-active" />
            <rect x="24" y="68" width="62" height="26" rx="7" className="aud-wire-box" />
            <rect x="99" y="68" width="62" height="26" rx="7" className="aud-wire-box" />
            <rect x="174" y="68" width="62" height="26" rx="7" className="aud-wire-box" />
            <path className="aud-flow-line aud-flow-strong" d="M130 38 V54 M55 54 H205 M55 54 V68 M130 54 V68 M205 54 V68" />
            <circle cx="130" cy="26" r="5" className="aud-dot-accent aud-pulse" />
          </svg>
          <div className="aud-chip-row">
            <span className="aud-chip is-accent">Strategy</span>
            <span className="aud-chip">Teams</span>
            <span className="aud-chip">Audit Trail</span>
          </div>
        </div>
      </div>
    ),
  },
  social: {
    kicker: 'Community Impact',
    title: 'Programmes, partners & measurable outcomes',
    render: () => (
      <div className="aud-3d-stage aud-scene-social">
        <div className="aud-3d-back-card">
          <span>Delivery Network</span>
          <strong>Partner Synced</strong>
        </div>
        <div className="aud-3d-main-card">
          <svg className="aud-vec" viewBox="0 0 260 112" aria-hidden="true">
            <path className="aud-flow-line" d="M48 78 Q 130 14, 212 78" />
            <path className="aud-flow-line aud-flow-strong aud-delay-1" d="M48 78 Q 130 96, 212 78" />
            <circle cx="48" cy="78" r="8" className="aud-dot-teal" />
            <circle cx="130" cy="36" r="9" className="aud-dot-accent aud-pulse" />
            <circle cx="212" cy="78" r="8" className="aud-dot-teal" />
          </svg>
          <div className="aud-chip-row">
            <span className="aud-chip">Programmes</span>
            <span className="aud-chip is-accent">Partners</span>
            <span className="aud-chip">Impact</span>
          </div>
        </div>
      </div>
    ),
  },
};

/** Unique, airy 3D + vector animated visual tailored to each audience segment. */
export function AudienceContextIllustration({
  audienceId,
  audienceName,
  ratio = '4 / 3',
}: {
  audienceId: string;
  audienceName: string;
  ratio?: string;
}) {
  const scene = SCENES[audienceId] ?? SCENES.professionals;

  return (
    <div
      className="aud-context-visual"
      data-audience={audienceId}
      style={{ aspectRatio: ratio }}
      role="img"
      aria-label={`${audienceName}: ${scene.title}`}
    >
      <div className="aud-context-glow" aria-hidden="true" />
      <div className="aud-context-header" aria-hidden="true">
        <span className="aud-context-kicker">{scene.kicker}</span>
        <span className="aud-context-caption">{scene.title}</span>
      </div>
      {scene.render()}
    </div>
  );
}
