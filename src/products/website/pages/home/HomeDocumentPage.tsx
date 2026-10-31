import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { UpdatedDocumentPage } from '../../../../shared/content/UpdatedDocumentPage';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { HomeFooter } from './components/HomeFooter';
import {
  LandingAi,
  LandingClose,
  LandingHero,
  LandingProducts,
  LandingResults,
  LandingTiles,
  LandingTrust,
  LandingWhatIs,
} from './landing/Landing';
import './home.css';

const outcomeSteps = [
  {
    title: 'Start with what matters',
    text: 'Bring a decision, opportunity, challenge or plan. Your Companion helps you find the next step.',
  },
  {
    title: 'Work toward the outcome',
    text: 'Connect the context, capability and action required to move the work forward.',
  },
  {
    title: 'Build a useful rhythm',
    text: 'Keep progress visible today, this week and over time—without losing control.',
  },
] as const;

function HomeOutcomeSummary() {
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || !('IntersectionObserver' in window)) {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setInView(true);
        observer.disconnect();
      },
      { threshold: 0.15, rootMargin: '0px 0px 40px 0px' },
    );
    observer.observe(el);
    const timer = setTimeout(() => setInView(true), 1200);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`home-outcome-summary ${inView ? 'is-in-view' : ''}`}
      aria-labelledby="home-outcome-title"
    >
      <div className="home-outcome-summary-inner">
        <h2 id="home-outcome-title">From your objective to steady progress.</h2>
        <div className="home-outcome-progress-track" aria-hidden="true">
          <div className="home-outcome-progress-bar" />
        </div>
        <div className="home-outcome-summary-grid">
          {outcomeSteps.map((step, index) => (
            <article
              key={step.title}
              style={{ '--step-i': index } as CSSProperties}
              className="home-outcome-step-card"
            >
              <div className="home-outcome-step-badge">
                <span className="home-outcome-step-num">0{index + 1}</span>
                <span className="home-outcome-step-dot" />
              </div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Preserve the GitHub homepage's original section components and reading order.
 * The approved video hero and document additions use homepage-owned presentation. Three original
 * slides that the document additions now cover (the companion steps, Continuous Intelligence and
 * the first closing call to action) moved to /about — see movedFromHome in AboutDocumentPage. */
export function HomeDocumentPage({ embedded = false }: DocumentPageProps) {
  if (embedded) return <UpdatedDocumentPage content={content} embedded />;
  return (
    <div className="lamid-home" data-source-page={content.page}>
      <LandingHero />
      <LandingTiles />
      <LandingWhatIs />
      <LandingTrust />
      <LandingProducts />
      <LandingAi />
      <LandingResults />
      <HomeOutcomeSummary />
      <LandingClose />
      <HomeFooter />
    </div>
  );
}
