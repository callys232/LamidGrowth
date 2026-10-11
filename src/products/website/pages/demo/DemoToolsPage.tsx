import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { m, useReducedMotion } from 'motion/react';
import { ArrowDown, ArrowRight, Clock } from 'lucide-react';
import { DecisionQualityPreview } from './DecisionQualityPreview';
import { DemoVideoPlayer } from './DemoVideoPlayer';
import { DemoVideoLibrary } from './DemoVideoLibrary';
import { AllEngineDemos } from './CatalogEngineDemo';
import { DemoProfileLauncher } from './DemoProfileLauncher';
import './demo-videos.css';
import { DemoToolPanel, EASE, PushDown } from './DemoToolPanel';
import { HERO_TOOL, START_HERE, type FeaturedTool } from './featuredTools';
import '../../../engines/pages/engines-page.css';
import './demo-tools.css';

/** /demo — public, no signup required. Three slides: a hero that plays a real Decision Quality
 * result, the same tool live with its benefits, then four more hand-picked tools to start with.
 * Every run is real compute (POST /engines/:code/demo-run — same as the authenticated path, no
 * charge, no persistence, no account), so a visitor sees one genuine result before deciding to
 * sign up, rather than being handed a fake full workspace. */
export function DemoToolsPage() {
  const heroToolRef = useRef<HTMLElement>(null);
  const pickedRef = useRef<HTMLDivElement>(null);
  const [picked, setPicked] = useState<FeaturedTool | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (picked) pickedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [picked]);

  return (
    <div className="demo-tools-page" data-scroll-feedback="off">
      <section id="profile-demos" className="demo-slide">
        <div className="demo-tools-container">
          <DemoProfileLauncher />
        </div>
      </section>
      <section className="demo-slide">
        <div className="demo-tools-container">
          <DemoVideoLibrary />
        </div>
      </section>
      <section className="demo-slide demo-hero">
        <div className="demo-tools-container demo-hero-grid">
          <div className="demo-hero-copy">
            <span className="demo-tools-eyebrow">Try it — no account needed</span>
            <h2>Is your next decision ready to make?</h2>
            <p>
              Run a real diagnostic in about {HERO_TOOL.minutes} minutes. Same engine as the
              product. Nothing saved, nothing charged.
            </p>
            <div className="demo-hero-actions">
              <button
                type="button"
                className="button button-primary"
                onClick={() =>
                  heroToolRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              >
                Try {HERO_TOOL.name} <ArrowDown aria-hidden="true" size={16} />
              </button>
              <a className="demo-hero-link" href="#start-here">
                Or pick another tool
              </a>
            </div>
          </div>
          <DecisionQualityPreview />
        </div>
      </section>

      <section ref={heroToolRef} id="try-decision-quality" className="demo-slide demo-slide-alt">
        <div className="demo-tools-container">
          <DemoToolPanel tool={HERO_TOOL} />
        </div>
      </section>

      <section id="start-here" className="demo-slide">
        <div className="demo-tools-container">
          <div className="demo-section-head">
            <span className="demo-tools-eyebrow">Start here</span>
            <h2>Four more worth a first try</h2>
            <p>
              Each one is quick, runs for real, and answers a question you probably already have.
            </p>
          </div>

          <ul className="demo-cards">
            {START_HERE.map((tool, i) => (
              <m.li
                key={tool.code}
                initial={reduced ? false : { opacity: 0, y: -16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.45, delay: i * 0.08, ease: EASE }}
              >
                <button
                  type="button"
                  className={picked?.code === tool.code ? 'demo-card is-active' : 'demo-card'}
                  aria-pressed={picked?.code === tool.code}
                  onClick={() => setPicked(tool)}
                >
                  <strong>{tool.name}</strong>
                  <span className="demo-card-hook">{tool.hook}</span>
                  <span className="demo-card-foot">
                    <span>
                      <Clock aria-hidden="true" size={13} /> ~{tool.minutes} min
                    </span>
                    <span className="demo-card-try">
                      Try it <ArrowRight aria-hidden="true" size={14} />
                    </span>
                  </span>
                </button>
              </m.li>
            ))}
          </ul>

          {picked && (
            <div ref={pickedRef} className="demo-picked">
              <PushDown key={picked.code} reduced={reduced}>
                <DemoToolPanel tool={picked} startOpen />
              </PushDown>
            </div>
          )}
        </div>
      </section>

      <section className="demo-slide demo-motion" aria-labelledby="demo-motion-heading">
        <div className="demo-tools-container">
          <div className="demo-section-head">
            <span className="demo-tools-eyebrow">From sign-up to answers</span>
            <h2 id="demo-motion-heading">See it in motion</h2>
          </div>
          <DemoVideoPlayer />
        </div>
      </section>

      <AllEngineDemos />
      <section className="demo-slide demo-closing">
        <div className="demo-tools-container">
          <h2>Save your results and unlock everything.</h2>
          <p>Your own workspace, every diagnostic, and results that build on each other.</p>
          <Link className="button button-primary" to="/signup">
            Create your account
          </Link>
        </div>
      </section>
    </div>
  );
}
