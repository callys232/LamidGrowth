import { Link } from 'react-router-dom';
import type { ProductSuiteConfig } from '../ProductSuitePage';
import './heroes.css';

interface SuiteHeroProps {
  config: ProductSuiteConfig;
}

const suiteVisualCopy: Record<
  string,
  { kicker: string; headline: string; bars: Array<{ label: string; pct: number; value: string }> }
> = {
  strategy: {
    kicker: 'Alignment',
    headline: 'Keep every team pulling the same way',
    bars: [
      { label: 'Core Priorities', pct: 88, value: '88%' },
      { label: 'Active Work', pct: 74, value: '74%' },
      { label: 'Budget Fit', pct: 82, value: '82%' },
    ],
  },
  decisions: {
    kicker: 'Clarity',
    headline: 'Know why you chose—before you commit',
    bars: [
      { label: 'Clear Framing', pct: 92, value: '92%' },
      { label: 'Options Tested', pct: 78, value: '78%' },
      { label: 'Single Owner', pct: 95, value: '95%' },
    ],
  },
  people: {
    kicker: 'Capability',
    headline: 'Build the skills your next stage needs',
    bars: [
      { label: 'Role Readiness', pct: 84, value: '84%' },
      { label: 'Bench Depth', pct: 72, value: '72%' },
      { label: 'Team Retention', pct: 91, value: '91%' },
    ],
  },
  operations: {
    kicker: 'Flow',
    headline: 'Spot bottlenecks before delivery slips',
    bars: [
      { label: 'On-Time Flow', pct: 89, value: '89%' },
      { label: 'Healthy Workload', pct: 80, value: '80%' },
      { label: 'First-Time Right', pct: 94, value: '94%' },
    ],
  },
  finance: {
    kicker: 'Runway',
    headline: 'See your cash and margin drivers clearly',
    bars: [
      { label: '13-Week Buffer', pct: 86, value: 'Healthy' },
      { label: 'Gross Margin', pct: 68, value: '68%' },
      { label: 'Capital Return', pct: 79, value: 'Strong' },
    ],
  },
  'risk-governance': {
    kicker: 'Protection',
    headline: 'Catch exposures early while you can act',
    bars: [
      { label: 'Controls Ready', pct: 88, value: '88%' },
      { label: 'Early Warnings', pct: 92, value: 'Active' },
      { label: 'Recovery Plan', pct: 84, value: 'Tested' },
    ],
  },
  'growth-change': {
    kicker: 'Momentum',
    headline: 'Scale new bets without burning out your team',
    bars: [
      { label: 'Core Growth', pct: 70, value: '70%' },
      { label: 'New Channels', pct: 20, value: '20%' },
      { label: 'Team Readiness', pct: 86, value: 'Ready' },
    ],
  },
  advisory: {
    kicker: 'Partnership',
    headline: 'Bring in seasoned leaders when it counts',
    bars: [
      { label: 'Scope Agreed', pct: 100, value: 'Clear' },
      { label: 'Escrow Protected', pct: 100, value: '100%' },
      { label: 'Verified Delivery', pct: 96, value: 'On Track' },
    ],
  },
};

const suite3dArt: Record<string, string> = {
  strategy: '/media/suites/strategy-3d.jpg',
  decisions: '/media/suites/decisions-3d.jpg',
  people: '/media/suites/people-3d.jpg',
  operations: '/media/suites/operations-3d.jpg',
  finance: '/media/suites/finance-3d.jpg',
  'growth-change': '/media/suites/growth-change-3d.jpg',
  'risk-governance': '/media/suites/risk-governance-3d.jpg',
  advisory: '/media/suites/advisory-3d.jpg',
};

const suiteLayoutMap: Record<string, string> = {
  strategy: 'split',
  decisions: 'bento-row',
  people: 'pin-left',
  operations: 'split-reverse',
  finance: 'editorial-wide',
  'risk-governance': 'banner-overlap',
  'growth-change': 'diagonal-stack',
  advisory: 'executive-rail',
};

export function SuiteHeroDispatcher({ config }: SuiteHeroProps) {
  const visual = suiteVisualCopy[config.id] || suiteVisualCopy.strategy;
  const artSrc = suite3dArt[config.id] || suite3dArt.strategy;
  const layout = suiteLayoutMap[config.id] || 'split';

  return (
    <section
      className="airy-hero-wrap"
      data-pillar={config.pillar}
      data-suite={config.id}
      data-layout={layout}
    >
      <nav className="hero-base-crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link> <span aria-hidden="true">/</span>{' '}
        <Link to="/product">Product</Link> <span aria-hidden="true">/</span>{' '}
        <span>{config.name}</span>
      </nav>

      <div className="airy-hero-grid">
        <div className="airy-hero-copy">
          <div className="airy-hero-badges">
            <span className="suite-pillar-badge">{config.pillar} PILLAR</span>
            <span className="airy-hero-eyebrow">{config.eyebrow}</span>
          </div>

          <h1 className="suite-title">{config.title}</h1>
          <p className="suite-lede">{config.lede}</p>

          <div className="prod-actions suite-actions">
            <Link className="prod-btn prod-btn-solid" to="/signup">
              Get Started
            </Link>
            <Link className="prod-btn prod-btn-outline" to="/demo">
              Try Live Demo
            </Link>
          </div>

          <div className="airy-hero-tags" aria-label={`${config.name} capabilities`}>
            {config.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="suite-tag-pill">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="airy-hero-visual" data-suite={config.id} aria-hidden="true">
          <div className="airy-visual-card">
            <div className="airy-visual-3d-frame">
              <img src={artSrc} alt="" loading="eager" decoding="async" />
            </div>
            <div className="airy-visual-body">
              <span className="airy-visual-kicker">{visual.kicker}</span>
              <p className="airy-visual-headline">{visual.headline}</p>
              <div className="airy-visual-bars">
                {visual.bars.map((bar) => (
                  <div key={bar.label} className="airy-visual-bar-row">
                    <div className="airy-visual-bar-meta">
                      <span>{bar.label}</span>
                      <strong>{bar.value}</strong>
                    </div>
                    <div className="airy-visual-bar-track">
                      <div className="airy-visual-bar-fill" style={{ width: `${bar.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
