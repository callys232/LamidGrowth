import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PhotoSlot, audiences, brochureClients, pillars } from '../../../../../shared/brand';
import './landing.css';
import '../../motion.css';

function Actions() {
  return (
    <div className="lg-actions">
      <Link className="lg-btn lg-btn-solid" to="/contact">
        Get a demo
      </Link>
      <Link className="lg-btn lg-btn-outline" to="/signup">
        Get started
      </Link>
    </div>
  );
}

export function LandingHero() {
  return (
    <section className="lg-hero" aria-labelledby="lg-hero-title">
      <p className="lg-eyebrow">The Human&ndash;AI Growth Operating System</p>
      <h1 id="lg-hero-title">
        Decide what matters,
        <br className="lg-br" /> build what&rsquo;s needed,
        <br className="lg-br" /> and deliver the results &mdash; all in one place
        <span className="lg-dot">.</span>
      </h1>
      <p className="lg-sub">
        LamidOne puts experienced advisers and AI tools around your goals, so you always know the
        next step and you stay in control.
      </p>
      <Actions />
    </section>
  );
}

const tiles = [
  {
    pillar: 'clarity',
    caption: 'Know what matters, in one view.',
    brief: 'Clarity tool in use: prioritising what matters',
    featured: false,
  },
  {
    pillar: 'capability',
    caption: 'Build the plans, skills and teams you need.',
    brief: 'Capability tool in use: building a plan',
    featured: true,
  },
  {
    pillar: 'consistency',
    caption: 'Deliver steadily, with advisers beside you.',
    brief: 'Consistency tool in use: tracking delivery',
    featured: false,
  },
] as const;

function playVideo(event: { currentTarget: HTMLElement }) {
  const video = event.currentTarget.querySelector('video');
  if (video && video.paused) void video.play().catch(() => undefined);
}

export function LandingTiles() {
  return (
    <section className="lg-tiles" aria-label="What you get">
      {tiles.map(({ pillar, caption, brief, featured }) => (
        <figure
          tabIndex={0}
          key={pillar}
          className={`lg-tile${featured ? ' lg-tile-featured' : ''}`}
          data-pillar={pillar}
          onMouseEnter={playVideo}
          onFocus={playVideo}
        >
          <video autoPlay muted loop playsInline preload="metadata" aria-label={brief}>
            <source src={`/videos/${pillar}-demo.webm`} type="video/webm" />
            <source src={`/videos/${pillar}-demo.mp4`} type="video/mp4" />
          </video>
          <figcaption>
            <span className="lg-tile-kicker">{pillar}</span>
            {caption}
          </figcaption>
        </figure>
      ))}
    </section>
  );
}

export function LandingWhatIs() {
  return (
    <section className="lg-split" aria-labelledby="lg-what">
      <h2 id="lg-what">What is LamidOne?</h2>
      <div className="lg-what-copy">
        <p className="lg-what-lead">
          LamidOne brings your goals, tools, expert advisers and AI together in one place, so every
          decision leads to finished work.
        </p>
      </div>
    </section>
  );
}

export function LandingTrust() {
  const row = [...brochureClients, ...brochureClients];
  return (
    <section className="lg-trust" aria-label="Track record">
      <h3>
        Advising organisations
        <br />
        since 1988
      </h3>
      <div className="lg-marquee" aria-label="Client names, logos pending permission">
        <div className="lg-marquee-track">
          {row.map((name, index) => (
            <span
              className="lg-logo"
              key={`${name}-${index}`}
              aria-hidden={index >= brochureClients.length}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

const products = [
  {
    name: 'Strategy',
    points: ['Line up purpose, priorities and plan.', 'Rank what to do first.'],
  },
  {
    name: 'Decisions',
    points: ['Record decisions and who owns them.', 'Score the quality before you commit.'],
  },
  {
    name: 'People & skills',
    points: ['Find skills gaps and plan your workforce.', 'Build your bench and culture.'],
  },
  {
    name: 'Operations',
    points: ['Spot delays and bottlenecks in how work flows.', 'Catch drift before it costs you.'],
  },
  {
    name: 'Finance',
    points: ['See cash, health and forecasts clearly.', 'Link KPIs to the drivers behind them.'],
  },
  {
    name: 'Risk & governance',
    points: ['Keep a risk register with early warnings.', 'Check compliance and continuity.'],
  },
  {
    name: 'Growth & change',
    points: ['Score opportunities and map growth paths.', 'Test change readiness and track it.'],
  },
  {
    name: 'Expert advisory',
    points: [
      'Work with LamidConsulting advisers on hard calls.',
      'Get human review before big decisions.',
    ],
  },
] as const;
const areaStyle: Record<string, { pillar: string; icon: string[] }> = {
  Strategy: { pillar: 'clarity', icon: ['M12 3v18', 'M12 4l7 3-7 3', 'M7 21h10'] },
  Decisions: { pillar: 'clarity', icon: ['M6 4v6a6 6 0 006 6h6', 'M14 12l4 4-4 4', 'M6 4h.01'] },
  'People & skills': {
    pillar: 'capability',
    icon: [
      'M9 11a3 3 0 100-6 3 3 0 000 6z',
      'M3 20a6 6 0 0112 0',
      'M16 5a3 3 0 010 6',
      'M18 14a5 5 0 013 5',
    ],
  },
  Operations: {
    pillar: 'capability',
    icon: [
      'M12 15a3 3 0 100-6 3 3 0 000 6z',
      'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1',
    ],
  },
  Finance: { pillar: 'growth', icon: ['M4 20V10', 'M10 20V4', 'M16 20v-8', 'M22 20H2'] },
  'Risk & governance': {
    pillar: 'consistency',
    icon: ['M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', 'M9 12l2 2 4-4'],
  },
  'Growth & change': { pillar: 'growth', icon: ['M3 17l6-6 4 4 8-8', 'M15 7h6v6'] },
  'Expert advisory': {
    pillar: 'consistency',
    icon: [
      'M12 12a4 4 0 100-8 4 4 0 000 8z',
      'M4 21a8 8 0 0116 0',
      'M17 4l1 2 2 .3-1.5 1.5.4 2.2L17 9l-2 1 .4-2.2L14 6.3 16 6z',
    ],
  },
};

export function LandingProducts() {
  return (
    <section className="lg-products" aria-labelledby="lg-products-title">
      <div className="lg-products-intro">
        <h2 id="lg-products-title">Growing is hard. LamidOne makes it clearer.</h2>
        <p>Scattered tools slow you down. LamidOne connects them in one place.</p>
        <Actions />
      </div>
      <div className="lg-card-wrap">
        <div className="lg-card-grid" tabIndex={0} aria-label="LamidOne tool areas">
          {products.map((product) => {
            const style = areaStyle[product.name];
            return (
              <Link key={product.name} className="lg-card" to="/product" data-pillar={style.pillar}>
                <span className="lg-card-icon" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {style.icon.map((d) => (
                      <path key={d} d={d} />
                    ))}
                  </svg>
                </span>
                <h3>{product.name}</h3>
                <ul className="lg-line">
                  {product.points.map((point) => (
                    <li key={point}>
                      <svg viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M3 8.5l3.2 3L13 4.5" />
                      </svg>
                      {point}
                    </li>
                  ))}
                </ul>
                <span className="lg-foot">
                  <span className="lg-more">Learn more &rarr;</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const helpers = [
  {
    name: 'Growth Companion',
    text: 'Ask about a decision, a goal or a challenge and get a structured next step.',
    clip: 'Q02',
  },
  {
    name: 'Expert hand-off',
    text: 'Bring in an adviser at any point, with the full context.',
    clip: 'A02',
  },
  { name: 'You approve', text: 'Nothing consequential happens until you say so.', clip: 'Q99' },
];

function AiClip({ code, label }: { code: string; label: string }) {
  return (
    <div className="lg-ai-media" onMouseEnter={playVideo} onFocus={playVideo}>
      <video
        key={code}
        autoPlay
        muted
        loop
        playsInline
        poster={`/videos/engines/${code}.jpg`}
        aria-label={label}
      >
        <source src={`/videos/engines/${code}.webm`} type="video/webm" />
        <source src={`/videos/engines/${code}.mp4`} type="video/mp4" />
      </video>
    </div>
  );
}

export function LandingAi() {
  const [active, setActive] = useState(0);
  return (
    <section className="lg-ai" aria-labelledby="lg-ai-title">
      <div className="lg-ai-head">
        <h2 id="lg-ai-title">AI you direct. Advisers you trust.</h2>
        <p>
          The Growth Companion suggests, explains and prepares. People decide. Continuous
          intelligence, human control.
        </p>
      </div>
      <div className="lg-ai-body">
        <div className="lg-ai-cards">
          {helpers.map((helper, index) => (
            <button
              type="button"
              className={`lg-ai-card${index === active ? ' is-active' : ''}`}
              key={helper.name}
              aria-pressed={index === active}
              onClick={() => setActive(index)}
            >
              <h3>{helper.name}</h3>
              <p>{helper.text}</p>
            </button>
          ))}
        </div>
        <AiClip code={helpers[active].clip} label={`${helpers[active].name} in use`} />
      </div>
    </section>
  );
}

const playbookByPillar: Record<string, string> = {
  clarity: 'Make decisions with clear ownership',
  capability: 'Plan the next development step',
  consistency: 'Review delivery without chasing noise',
};

const results = audiences.map((a) => ({
  tab: a.name,
  route: a.route,
  playbook: playbookByPillar[a.lead.pillar] ?? 'Choose opportunities and review value',
  brief: `A real ${a.name.toLowerCase()} client at work (photo to be supplied)`,
  headline: a.ownsIdea,
  points: [a.lead.words, a.second.words],
  pillar: pillars.find((p) => p.id === a.lead.pillar),
  secondPillar: pillars.find((p) => p.id === a.second.pillar),
}));

export function LandingResults() {
  const [active, setActive] = useState(0);
  const current = results[active];
  return (
    <section className="lg-results" aria-labelledby="lg-results-title">
      <h2 id="lg-results-title">Built for every kind of organisation.</h2>
      <div className="lg-tabs" role="tablist">
        {results.map((result, index) => (
          <button
            key={result.tab}
            type="button"
            role="tab"
            aria-selected={index === active}
            className={index === active ? 'is-active' : ''}
            onClick={() => setActive(index)}
          >
            {result.tab}
          </button>
        ))}
      </div>
      <div className="lg-result" role="tabpanel">
        <div className="lg-result-media">
          <PhotoSlot brief={current.brief} ratio="16 / 10" />
        </div>
        <div
          className="lg-result-copy"
          style={{ '--aud': current.pillar?.color } as React.CSSProperties}
        >
          <span className="lg-result-pillar">
            {current.pillar?.name} · {current.pillar?.verb}
          </span>
          <h3 className="lg-result-text">{current.headline}</h3>
          <div className="lg-result-start">
            <span className="lg-result-label">Start with</span>
            <p className="lg-result-name">{current.playbook}</p>
            <p className="lg-result-role">{current.points[0]}</p>
          </div>
          <p
            className="lg-result-second"
            style={{ '--aud': current.secondPillar?.color } as React.CSSProperties}
          >
            <span>{current.secondPillar?.name}</span> {current.points[1]}
          </p>
          <div className="lg-result-links">
            <Link className="lg-result-primary" to="/insights#playbook-library">
              Browse playbooks
            </Link>
            <Link to="/case-studies">Case studies</Link>
            <Link to={current.route}>For {current.tab}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingClose() {
  return (
    <section className="lg-close" aria-labelledby="lg-close-title">
      <h2 id="lg-close-title">Make growth feel clear, not complicated.</h2>
      <Actions />
    </section>
  );
}
