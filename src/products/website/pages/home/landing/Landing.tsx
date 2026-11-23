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
import { audiences, pillars } from '../../../../../shared/brand';
import { AudienceContextIllustration } from '../../../../../shared/brand/AudienceContextIllustration';
import { OrbitVisual } from '../../../../../shared/visuals/Orbit';
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

const heroPillars = [
  {
    num: '01',
    title: 'Make Informed Decisions.',
    copy: 'Access continuous intelligence and trusted expertise.',
    to: '/product/decisions',
    image: '/media/hero/pillar-01-decisions.jpg',
    altImage: '/media/hero/pillar-01-decisions-b.jpg',
    alt: 'Layered glass and crimson architectural planes',
  },
  {
    num: '02',
    title: 'Turn Capabilities into Execution.',
    copy: 'Connect resources, build skills, and deliver projects.',
    to: '/product/operations',
    image: '/media/hero/pillar-02-capabilities.jpg',
    altImage: '/media/hero/pillar-02-capabilities-b.jpg',
    alt: 'Interlocking frosted glass, steel, and crimson modular blocks',
  },
  {
    num: '03',
    title: 'Drive Growth with Confidence.',
    copy: 'Track progress, measure impact, and scale results.',
    to: '/product/growth-change',
    image: '/media/hero/pillar-03-growth.jpg',
    altImage: '/media/hero/pillar-03-growth-b.jpg',
    alt: 'Ascending metallic bars with crimson trajectory curve',
  },
] as const;

export function LandingHero() {
  const hero = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = hero.current;
    if (!section) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    let targetNx = 0;
    let targetNy = 0;
    let currentNx = 0;
    let currentNy = 0;
    let mouseRaf = 0;

    const tickMouse = () => {
      currentNx += (targetNx - currentNx) * 0.085;
      currentNy += (targetNy - currentNy) * 0.085;
      section.style.setProperty('--lg-mouse-x', currentNx.toFixed(4));
      section.style.setProperty('--lg-mouse-y', currentNy.toFixed(4));

      const settled =
        Math.abs(targetNx - currentNx) < 0.001 && Math.abs(targetNy - currentNy) < 0.001;
      if (!settled) {
        mouseRaf = requestAnimationFrame(tickMouse);
      } else {
        mouseRaf = 0;
      }
    };

    const startTick = () => {
      if (!mouseRaf) mouseRaf = requestAnimationFrame(tickMouse);
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = section.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      targetNx = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width - 0.5) * 2));
      targetNy = Math.max(-1, Math.min(1, ((e.clientY - rect.top) / rect.height - 0.5) * 2));
      startTick();

      const orbitHost = section.querySelector<HTMLElement>('.orbit-visual');
      orbitHost?.dispatchEvent(
        new PointerEvent('pointermove', {
          clientX: e.clientX,
          clientY: e.clientY,
          pointerType: e.pointerType,
        }),
      );
    };

    const onPointerLeave = () => {
      targetNx = 0;
      targetNy = 0;
      startTick();

      const orbitHost = section.querySelector<HTMLElement>('.orbit-visual');
      orbitHost?.dispatchEvent(new PointerEvent('pointerleave'));
    };

    section.addEventListener('pointermove', onPointerMove, { passive: true });
    section.addEventListener('pointerleave', onPointerLeave, { passive: true });

    return () => {
      cancelAnimationFrame(mouseRaf);
      section.removeEventListener('pointermove', onPointerMove);
      section.removeEventListener('pointerleave', onPointerLeave);
      section.style.removeProperty('--lg-mouse-x');
      section.style.removeProperty('--lg-mouse-y');
    };
  }, []);

  return (
    <section ref={hero} className="lg-hero lg-hero-editorial" aria-labelledby="lg-hero-title">
      <div className="lg-hero-stage-dark">
        <div className="lg-hero-orbit-bg" aria-hidden="true">
          <OrbitVisual />
          <div className="lg-hero-orbit-scrim" />
        </div>

        <div className="lg-hero-inner">
          <div className="lg-hero-copy-col">
            <p className="lg-eyebrow">
              <span className="lg-eyebrow-rule" aria-hidden="true" />
              INTELLIGENT OPERATING ENVIRONMENT
            </p>
            <h1 id="lg-hero-title">
              <span>Power Intelligent Decisions.</span>
              <span className="lg-hero-accent-row">
                <span>Build Capabilities.</span>{' '}
                <span className="lg-hero-accent">Accelerate Growth</span>
              </span>
              <span className="lg-hero-sub-suffix">— all in one place.</span>
            </h1>
            <p className="lg-sub">
              <span className="lg-sub-lead">
                LAMID ONE is an intelligent operating environment that empowers people and
                organizations to access trusted expertise, execute projects, deliver results and
                achieve growth through <strong>continuous intelligence</strong>,{' '}
                <strong>decentralized decision-making</strong>, and{' '}
                <strong>structured delivery</strong>.
              </span>
              <span className="lg-sub-closer">
                LAMID ONE updates as your reality changes —{' '}
                <span className="lg-sub-closer-accent">with you in control always.</span>
              </span>
            </p>
            <div className="lg-hero-cta-row">
              <Link className="lg-btn-crimson" to="/signup">
                Get Started <span aria-hidden="true">&rarr;</span>
              </Link>
              <Link className="lg-btn-overview" to="/demo">
                <span className="lg-play-circle" aria-hidden="true">
                  &#9654;
                </span>
                Get Demo
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="lg-hero-bento" aria-label="Core platform capabilities">
        {heroPillars.map((item) => (
          <Link key={item.num} to={item.to} className="lg-bento-cell">
            <div className="lg-bento-copy">
              <span className="lg-bento-num">{item.num}</span>
              <h2 className="lg-bento-title">{item.title}</h2>
              <p className="lg-bento-desc">{item.copy}</p>
              <span className="lg-bento-link">
                Learn more <span aria-hidden="true">&rarr;</span>
              </span>
            </div>
            <div className="lg-bento-art">
              <img src={item.image} alt={item.alt} className="lg-bento-img-a" loading="eager" />
              <img
                src={item.altImage}
                alt=""
                aria-hidden="true"
                className="lg-bento-img-b"
                loading="eager"
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

const proofMetrics = [
  { value: 'Since 1988', label: 'Advising leaders & enterprises' },
  { value: 'Live Intelligence', label: 'Auditable, standards-backed math' },
  { value: 'Escrow Advisory', label: 'Vetted specialists on demand' },
  { value: '100% Human', label: 'You approve every consequential call' },
] as const;

function playVideo(event: { currentTarget: HTMLElement }) {
  const video = event.currentTarget.querySelector('video');
  if (video) {
    video.playbackRate = 0.65;
    if (video.paused) void video.play().catch(() => undefined);
  }
}

export function LandingProofBar() {
  return (
    <section className="lg-proof-sec" aria-label="Platform verification metrics">
      <div className="lg-proof-bar">
        {proofMetrics.map((item) => (
          <div key={item.value} className="lg-proof-item">
            <strong className="lg-proof-val">{item.value}</strong>
            <span className="lg-proof-lbl">{item.label}</span>
          </div>
        ))}
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
          Growing is hard.
          <br />
          <LamidOneBrand withIcon /> makes it clearer.
        </h2>
        <p>
          Fragmented systems create decision friction. LAMID ONE connects continuous intelligence to
          execution—giving teams the context to decide and the structure to deliver.
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
                <div className="lg-card-head">
                  <span className="lg-card-icon" aria-hidden="true">
                    <Icon />
                  </span>
                  <h3>{product.name}</h3>
                </div>
                <ul className="lg-line" data-scroll-feedback="off">
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
