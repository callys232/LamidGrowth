import { BrainCircuit, Layers3, ShieldCheck, Workflow } from 'lucide-react';
import type { MouseEvent } from 'react';
import content from '../content.json';
import { HomeOperatingCycle } from '../components/HomeOperatingCycle';
import { CompanionExample } from '../components/CompanionExample';
import { HomeSkyline } from '../components/HomeSkyline';

const SCROLL_DURATION_MS = 1100;

function slowScrollTo(event: MouseEvent<HTMLAnchorElement>) {
  const href = event.currentTarget.getAttribute('href');
  if (!href?.startsWith('#')) return;
  const target = document.querySelector(href);
  if (!target) return;
  event.preventDefault();
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    target.scrollIntoView();
    return;
  }
  const startY = window.scrollY;
  const targetY = startY + target.getBoundingClientRect().top;
  const startTime = performance.now();
  const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  function step(now: number) {
    const progress = Math.min(1, (now - startTime) / SCROLL_DURATION_MS);
    window.scrollTo(0, startY + (targetY - startY) * easeInOutCubic(progress));
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/** Follows the video hero: the Companion example, operating cycle, human-control card and page nav. */
/** Shortcuts to slides that are on the homepage (the companion and intelligence slides moved to
 * /about), looked up by label so they follow the copy. */
const discover = [
  'The Right Depth for Your Context',
  'Work Toward the Outcome',
  'Value Pillars',
  'How It Works',
].map((label) => content.sections.find((s) => s.label === label)!);

export function HomeHeroSlide() {
  const [continuity, control] = content.continuity.paragraphs;
  const [continuityIntro, ...continuityBody] = continuity.text.split(': ');
  const progression = continuityBody
    .join(': ')
    .split('; ')
    .map((text) => text.replace(/^and /, ''));
  const progressionTypes = [
    { title: 'Context', icon: Layers3 },
    { title: 'Intelligence', icon: BrainCircuit },
    { title: 'Authorized work', icon: Workflow },
  ];
  return (
    <>
      <section className="home-premium-hero home-continuation">
        <HomeSkyline />
        <div className="home-container">
          <p className="home-hero-assurance">
            <ShieldCheck size={15} />
            <span data-source-paragraph={control.sourceParagraph}>{control.text}</span>
          </p>
          <CompanionExample />
          <HomeOperatingCycle />
        </div>
      </section>
      <section
        className="home-permissions home-container"
        aria-labelledby="home-permissions-heading"
      >
        <div className="home-permissions-card">
          <header className="home-permissions-heading">
            <span className="home-permissions-seal" aria-hidden="true">
              <ShieldCheck size={25} strokeWidth={1.4} />
            </span>
            <div>
              <span className="home-eyebrow">HUMAN CONTROL</span>
              <h2 id="home-permissions-heading">
                Progress within <em>your permissions.</em>
              </h2>
            </div>
            <p data-source-paragraph={continuity.sourceParagraph}>{continuityIntro}.</p>
          </header>
          <details className="home-disclosure">
            <summary>Explore the three ways progress continues</summary>
            <ol
              className="home-permissions-lanes"
              data-source-paragraph={continuity.sourceParagraph}
            >
              {progressionTypes.map(({ title: laneTitle, icon: Icon }, index) => (
                <li key={laneTitle}>
                  <div className="home-permissions-lane-top">
                    <Icon size={21} strokeWidth={1.5} aria-hidden="true" />
                    <span>0{index + 1}</span>
                  </div>
                  <h3>{laneTitle}</h3>
                  <p>{progression[index]}</p>
                </li>
              ))}
            </ol>
          </details>
        </div>
      </section>
      <nav className="home-section-nav" aria-label="Explore this page">
        <div className="home-container">
          <span>Discover LAMID ONE</span>
          {discover.map((section) => (
            <a
              key={section.label}
              href={`#section-${section.paragraphs[0].sourceParagraph}`}
              onClick={slowScrollTo}
            >
              {section.title}
            </a>
          ))}
        </div>
      </nav>
    </>
  );
}
