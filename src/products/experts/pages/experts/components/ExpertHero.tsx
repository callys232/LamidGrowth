import { useState } from 'react';
import { Link } from 'react-router-dom';
import content from '../content.json';

interface JumpLink {
  label: string;
  href: string;
}

const MODES = {
  find: {
    label: 'For Organisations',
    badge: 'Context-First Matching',
    headline: 'Matched to the decision, not a keyword',
    detail: 'Compare verified credentials, scope boundaries, and relevant evidence before engaging.',
    ctaLabel: 'Find an Expert',
    ctaTo: '/contact',
  },
  join: {
    label: 'For Experts',
    badge: 'Verified Profile',
    headline: 'Bring your expertise into defined work',
    detail: 'Set your domains, engagement models, and proof once — receive relevant briefs.',
    ctaLabel: 'Join the Network',
    ctaTo: '#become-an-expert',
  },
} as const;

export function ExpertHero({ jumpLinks = [] }: { jumpLinks?: JumpLink[] }) {
  const [title, description] = content.hero.paragraphs;
  const [mode, setMode] = useState<'find' | 'join'>('find');
  const active = MODES[mode];

  return (
    <section className="expert-hero">
      <div className="expert-container expert-hero-grid">
        <div className="expert-hero-copy">
          <span className="expert-eyebrow">Expert Network</span>
          <h1 data-source-paragraph={title.sourceParagraph}>{title.text}</h1>
          <p className="expert-hero-description" data-source-paragraph={description.sourceParagraph}>
            {description.text}
          </p>

          <div className="expert-mode-toggle" role="group" aria-label="Expert perspective">
            {(['find', 'join'] as const).map((key) => (
              <button
                key={key}
                type="button"
                className={`expert-mode-pill${mode === key ? ' is-active' : ''}`}
                aria-pressed={mode === key}
                onClick={() => setMode(key)}
              >
                {MODES[key].label}
              </button>
            ))}
          </div>

          <div className="expert-hero-actions">
            {active.ctaTo.startsWith('#') ? (
              <a className="expert-btn expert-btn-light" href={active.ctaTo}>
                {active.ctaLabel}
              </a>
            ) : (
              <Link className="expert-btn expert-btn-light" to={active.ctaTo}>
                {active.ctaLabel}
              </Link>
            )}
            <a className="expert-btn expert-btn-ghost" href="#expert-matching">
              See How Matching Works
            </a>
          </div>
        </div>

        <div className="expert-hero-stage" aria-hidden="true">
          <svg className="expert-hero-orbit" viewBox="0 0 420 420" fill="none">
            <circle cx="210" cy="210" r="186" stroke="currentColor" strokeOpacity="0.16" strokeDasharray="6 8" />
            <circle cx="210" cy="210" r="138" stroke="currentColor" strokeOpacity="0.12" />
            <circle cx="52" cy="128" r="6" fill="#2aa198" />
            <circle cx="368" cy="154" r="5" fill="#d49b38" />
            <circle cx="332" cy="348" r="6" fill="#c12129" />
          </svg>

          <figure className="expert-hero-photo">
            <img
              src="/media/solutions/solutions-professionals.jpg"
              alt="Specialist adviser collaborating in a workspace"
              loading="eager"
            />
          </figure>

          <div className="expert-float-card expert-float-card-top">
            <span className="expert-float-dot" />
            <div>
              <strong>{active.badge}</strong>
              <span>{active.headline}</span>
            </div>
          </div>

          <div className="expert-float-card expert-float-card-bottom">
            <span className="expert-float-kicker">Human Choice</span>
            <p>{active.detail}</p>
          </div>
        </div>
      </div>

      {jumpLinks.length > 0 && (
        <nav className="expert-jump-nav" aria-label="Expert Network sections">
          <div className="expert-container expert-jump-list">
            {jumpLinks.map((item) => (
              <a key={item.href} className="expert-jump-pill" href={item.href}>
                {item.label}
              </a>
            ))}
          </div>
        </nav>
      )}
    </section>
  );
}
