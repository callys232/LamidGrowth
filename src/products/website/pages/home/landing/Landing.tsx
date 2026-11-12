import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  ChartNoAxesCombined,
  ClipboardCheck,
  Compass,
  MessagesSquare,
  ShieldCheck,
  Sprout,
  UsersRound,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { audiences, brochureClients, pillars } from '../../../../../shared/brand';
import { platformMessaging } from '../../../../../shared/brand/platformMessaging';
import { AudienceContextIllustration } from '../../../../../shared/brand/AudienceContextIllustration';
import content from '../content.json';
import './landing.css';
import '../../motion.css';

export function LamidOneBrand({ withIcon = false }: { withIcon?: boolean }) {
  return (
    <span className="lg-brand-mark">
      {withIcon && (
        <span className="lg-brand-mark-icon-wrap">
          <img
            src="/brand/lamidone-icon.png"
            alt=""
            className="lg-brand-mark-icon lg-brand-mark-icon--light"
            aria-hidden="true"
            width={40}
            height={40}
          />
          <img
            src="/brand/lamidone-icon-dark.png"
            alt=""
            className="lg-brand-mark-icon lg-brand-mark-icon--dark"
            aria-hidden="true"
            width={40}
            height={40}
          />
        </span>
      )}
      <span className="lg-brand-mark-text">
        <span className="lg-brand-mark-bold">LAMID</span>{' '}
        <span className="lg-brand-mark-light">ONE</span>
      </span>
    </span>
  );
}

function Actions() {
  return (
    <div className="lg-actions">
      {content.landingHero.actions.map((action, index) => (
        <Link
          className={`lg-btn ${index === 0 ? 'lg-btn-solid' : 'lg-btn-outline'}`}
          key={action.label}
          to={action.to}
        >
          {action.label}
        </Link>
      ))}
    </div>
  );
}

export function LandingHero() {
  const hero = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = hero.current;
    if (!section) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const { top, height } = section.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, -top / Math.max(height, 1)));
      section.style.setProperty('--lg-hero-art-drift', `${(-progress * 72).toFixed(1)}px`);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      section.style.removeProperty('--lg-hero-art-drift');
    };
  }, []);

  return (
    <section ref={hero} className="lg-hero" aria-labelledby="lg-hero-title">
      <div className="lg-hero-target" aria-hidden="true">
        <svg className="lg-hero-target-art" viewBox="0 0 800 800" fill="none">
          <g className="lg-target-orbit lg-target-orbit--outer">
            <circle cx="400" cy="400" r="330" />
            <circle cx="400" cy="400" r="272" />
            <circle cx="400" cy="70" r="6" className="lg-target-marker" />
          </g>
          <g className="lg-target-orbit lg-target-orbit--inner">
            <circle cx="400" cy="400" r="210" />
            <circle cx="400" cy="400" r="146" />
            <circle cx="400" cy="190" r="5" className="lg-target-marker lg-target-marker--teal" />
          </g>
          <path
            className="lg-target-crosshair"
            d="M400 22v174M400 604v174M22 400h174M604 400h174"
          />
          <path
            className="lg-target-route"
            d="M92 585c85-6 102-110 192-110 89 0 101 77 190 77 79 0 121-65 218-148"
          />
          <circle className="lg-target-point" cx="492" cy="552" r="13" />
          <circle className="lg-target-center" cx="400" cy="400" r="14" />
        </svg>
      </div>
      <div className="lg-hero-content">
        <p className="lg-eyebrow">{content.landingHero.eyebrow}</p>
        <h1 id="lg-hero-title">
          <span>
            {content.landingHero.titleLines[0]}
            <br className="lg-mobile-break" />{' '}
            <span className="lg-mobile-cap">{content.landingHero.titleLines[1]}</span>
          </span>
          <br />
          <span>
            {'and '}
            <span className="lg-mobile-cap">
              {content.landingHero.titleLines[2].replace(/^and\s+/, '')}
            </span>
          </span>
        </h1>
        <p className="lg-sub">{platformMessaging.description}</p>
        <Actions />
      </div>
    </section>
  );
}

const tiles = [
  {
    pillar: 'clarity',
    caption: 'Know what matters, in one view.',
    brief: 'Clarity engine in use: prioritising what matters',
    featured: false,
  },
  {
    pillar: 'capability',
    caption: 'Build the plans, skills and teams you need.',
    brief: 'Capability engine in use: building a plan',
    featured: true,
  },
  {
    pillar: 'consistency',
    caption: 'Deliver steadily, with advisers beside you.',
    brief: 'Consistency engine in use: tracking delivery',
    featured: false,
  },
] as const;

function playVideo(event: { currentTarget: HTMLElement }) {
  const video = event.currentTarget.querySelector('video');
  if (video) {
    video.playbackRate = 0.65;
    if (video.paused) void video.play().catch(() => undefined);
  }
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
          <video
            muted
            loop
            playsInline
            preload="none"
            poster={`/media/posters/${pillar}-demo.svg`}
            aria-label={brief}
          >
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
      <h2 id="lg-what" className="lg-split-title">
        <span>What</span> <span>is</span> <LamidOneBrand withIcon={false} />
        <span className="lg-split-q">?</span>
      </h2>
      <div className="lg-what-copy">
        <p className="lg-what-lead">
          <LamidOneBrand withIcon={false} /> is your Continuous Human–AI Growth Operating System
          that turns intelligence into sustained progress — helping you understand what matters,
          build what you need and keep moving forward, with you in control.
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
    href: '/product/strategy',
    points: ['Line up purpose, priorities and plan.', 'Rank what to do first.'],
  },
  {
    name: 'Decisions',
    href: '/product/decisions',
    points: ['Record decisions and who owns them.', 'Score the quality before you commit.'],
  },
  {
    name: 'People & skills',
    href: '/product/people',
    points: ['Find skills gaps and plan your workforce.', 'Build your bench and culture.'],
  },
  {
    name: 'Operations',
    href: '/product/operations',
    points: ['Spot delays and bottlenecks in how work flows.', 'Catch drift before it costs you.'],
  },
  {
    name: 'Finance',
    href: '/product/finance',
    points: ['See cash, health and forecasts clearly.', 'Link KPIs to the drivers behind them.'],
  },
  {
    name: 'Risk & governance',
    href: '/product/risk-governance',
    points: ['Keep a risk register with early warnings.', 'Check compliance and continuity.'],
  },
  {
    name: 'Growth & change',
    href: '/product/growth-change',
    points: ['Score opportunities and map growth paths.', 'Test change readiness and track it.'],
  },
  {
    name: 'Expert advisory',
    href: '/product/advisory',
    points: ['Match with Leading Experts.', 'Get human review before big decisions.'],
  },
] as const;
const areaStyle: Record<string, { pillar: string; icon: LucideIcon }> = {
  Strategy: { pillar: 'clarity', icon: Compass },
  Decisions: { pillar: 'clarity', icon: ClipboardCheck },
  'People & skills': { pillar: 'capability', icon: UsersRound },
  Operations: { pillar: 'capability', icon: Workflow },
  Finance: { pillar: 'growth', icon: ChartNoAxesCombined },
  'Risk & governance': { pillar: 'consistency', icon: ShieldCheck },
  'Growth & change': { pillar: 'growth', icon: Sprout },
  'Expert advisory': { pillar: 'consistency', icon: MessagesSquare },
};

export function LandingProducts() {
  const [cardsVisible, setCardsVisible] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = gridRef.current;
    if (!el || !('IntersectionObserver' in window)) {
      setCardsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setCardsVisible(true);
        observer.disconnect();
      },
      { threshold: 0.1, rootMargin: '0px 0px 50px 0px' },
    );
    observer.observe(el);
    const timer = setTimeout(() => setCardsVisible(true), 1200);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  return (
    <section className="lg-products" aria-labelledby="lg-products-title">
      <div className="lg-products-intro">
        <h2 id="lg-products-title">
          Growing is hard. <LamidOneBrand /> makes it clearer.
        </h2>
        <p>
          Fragmented systems create decision friction. <LamidOneBrand withIcon={false} /> connects
          continuous intelligence to execution—giving teams the context to decide and the structure
          to deliver.
        </p>
        <Actions />
      </div>
      <div className="lg-card-wrap">
        <div
          ref={gridRef}
          className={`lg-card-grid ${cardsVisible ? 'is-visible' : ''}`}
          tabIndex={0}
          aria-label="LAMID ONE capability areas"
        >
          {products.map((product, index) => {
            const style = areaStyle[product.name];
            const Icon = style.icon;
            return (
              <Link
                key={product.name}
                className="lg-card"
                to={product.href}
                data-pillar={style.pillar}
                style={{ '--card-i': index } as CSSProperties}
              >
                <span className="lg-card-icon" aria-hidden="true">
                  <Icon />
                </span>
                <h3>{product.name}</h3>
                <ul className="lg-line">
                  {product.points.map((point) => (
                    <li key={point}>
                      <span className="lg-line-bullet" aria-hidden="true" />
                      {point}
                    </li>
                  ))}
                </ul>
                <span className="lg-foot">
                  <span className="lg-more">
                    Learn more{' '}
                    <span className="lg-more-arrow" aria-hidden="true">
                      &rarr;
                    </span>
                  </span>
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
  const [headingVisible, setHeadingVisible] = useState(false);
  const section = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = section.current;
    if (!element || !('IntersectionObserver' in window)) {
      setHeadingVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setHeadingVisible(true);
        observer.disconnect();
      },
      { threshold: 0.3 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={section} className="lg-ai" aria-labelledby="lg-ai-title">
      <div className="lg-ai-head">
        <h2 id="lg-ai-title" className={headingVisible ? 'is-visible' : undefined}>
          <span>AI you direct.</span>
          <span>Advisers you trust.</span>
        </h2>
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
  audienceId: a.id,
  tab: a.name,
  route: a.route,
  playbook: playbookByPillar[a.lead.pillar] ?? 'Choose opportunities and review value',
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
      <h2 id="lg-results-title">Made for the work in front of you.</h2>
      <p className="lg-results-note">
        Explore how <LamidOneBrand withIcon={false} /> brings clearer decisions, stronger capability
        and steadier delivery into different working contexts.
      </p>
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
      <div className="lg-result" role="tabpanel" key={current.audienceId}>
        <div className="lg-result-media">
          <AudienceContextIllustration
            audienceId={current.audienceId}
            audienceName={current.tab}
            ratio="16 / 10"
          />
        </div>
        <div className="lg-result-copy" style={{ '--aud': current.pillar?.color } as CSSProperties}>
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
            style={{ '--aud': current.secondPillar?.color } as CSSProperties}
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
      <h2 id="lg-close-title">
        Make growth feel clear, not complicated with <LamidOneBrand />.
      </h2>
      <Actions />
    </section>
  );
}
