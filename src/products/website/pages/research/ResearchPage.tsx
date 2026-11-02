import { useState } from 'react';
import { Link } from 'react-router-dom';
import { pillars } from '../../../../shared/brand/pillars';
import '../motion.css';
import './research.css';

const areas = [
  {
    title: 'Human-AI decision support',
    pillar: pillars[0],
    clip: '/videos/clarity-demo',
    poster: '/media/posters/Q02.svg',
  },
  {
    title: 'Capability development',
    pillar: pillars[1],
    clip: '/videos/capability-demo',
    poster: '/media/posters/A02.svg',
  },
  {
    title: 'Operating rhythms',
    pillar: pillars[2],
    clip: '/videos/rhythm-demo',
    poster: '/media/posters/R05.svg',
  },
];

const lenses = ['Methods', 'Samples', 'Assumptions', 'Limitations', 'Sources'];

const bridge = [
  { label: 'Finding', note: 'What the study observed.' },
  { label: 'Implication', note: 'What it may mean for practice.' },
  { label: 'Design', note: 'How it shapes the product.' },
];

export function ResearchPage() {
  const [area, setArea] = useState(0);
  const [lens, setLens] = useState(0);
  const current = areas[area];

  return (
    <div className="rs-page">
      <header className="rs-hero">
        <p className="rs-eyebrow">Research</p>
        <h1>Understanding how humans and AI work better together.</h1>
        <div className="rs-hero-foot">
          <p>
            Published research and evidence informing LAMID ONE&rsquo;s approach to decision support,
            capability, organizations and responsible AI.
          </p>
          <a className="rs-btn rs-btn-solid" href="#rs-areas">
            Explore research
          </a>
        </div>
      </header>

      <section className="rs-areas" id="rs-areas" aria-labelledby="rs-areas-title">
        <h2 id="rs-areas-title">Research areas</h2>
        <div className="rs-areas-grid">
          <ul className="rs-area-list">
            {areas.map((item, i) => (
              <li key={item.title}>
                <button
                  type="button"
                  aria-pressed={i === area}
                  className={i === area ? 'is-active' : undefined}
                  style={{ '--rs-c': item.pillar.color } as React.CSSProperties}
                  onClick={() => setArea(i)}
                  onMouseEnter={() => setArea(i)}
                >
                  <span className="rs-dot" aria-hidden="true" />
                  <span className="rs-area-name">{item.title}</span>
                  <span className="rs-verb">{item.pillar.verb}</span>
                </button>
              </li>
            ))}
          </ul>
          <div
            className="rs-stage"
            style={{ '--rs-c': current.pillar.color } as React.CSSProperties}
          >
            <video
              key={current.clip}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster={current.poster}
              aria-label={`${current.title} preview`}
            >
              <source src={`${current.clip}.webm`} type="video/webm" />
              <source src={`${current.clip}.mp4`} type="video/mp4" />
            </video>
            <span className="rs-chip">
              {current.pillar.name} &middot; {current.pillar.tagline}
            </span>
          </div>
        </div>
      </section>

      <section className="rs-method" aria-labelledby="rs-method-title">
        <div className="rs-method-copy">
          <h2 id="rs-method-title">Method before message.</h2>
          <p>
            Review the methods, samples, assumptions, limitations and sources behind published
            research.
          </p>
        </div>
        <div className="rs-lens" role="group" aria-label="Evidence checks">
          {lenses.map((name, i) => (
            <button
              key={name}
              type="button"
              aria-pressed={i === lens}
              className={i === lens ? 'is-active' : undefined}
              onClick={() => setLens(i)}
              onMouseEnter={() => setLens(i)}
            >
              <span>{String(i + 1).padStart(2, '0')}</span>
              {name}
            </button>
          ))}
        </div>
        <div className="rs-ring" aria-hidden="true">
          {lenses.map((name, i) => (
            <i key={name} className={i <= lens ? 'on' : undefined} />
          ))}
        </div>
      </section>

      <section className="rs-bridge" aria-labelledby="rs-bridge-title">
        <h2 id="rs-bridge-title">From research to practice.</h2>
        <p>
          See how findings connect to practical design and operating implications, with limitations
          and causality kept explicit.
        </p>
        <ol>
          {bridge.map((step, i) => (
            <li key={step.label}>
              <span className="rs-step-n">{i + 1}</span>
              <strong>{step.label}</strong>
              <em>{step.note}</em>
            </li>
          ))}
        </ol>
        <p className="rs-gate">
          <span>To confirm</span> Studies appear here once documented, attributable and approved.
        </p>
      </section>

      <footer className="rs-close">
        <h2>Explore the evidence behind the approach.</h2>
        <div className="rs-actions">
          <Link className="rs-btn rs-btn-light" to="/insights">
            Read insights
          </Link>
          <Link className="rs-btn rs-btn-ghost" to="/contact">
            Contact us
          </Link>
        </div>
      </footer>
    </div>
  );
}
