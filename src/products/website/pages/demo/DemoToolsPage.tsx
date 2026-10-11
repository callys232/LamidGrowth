import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReducedMotion } from 'motion/react';
import { ArrowDown, Clock } from 'lucide-react';
import { DecisionQualityPreview } from './DecisionQualityPreview';
import { DemoVideoPlayer } from './DemoVideoPlayer';
import { DemoVideoLibrary } from './DemoVideoLibrary';
import { AllEngineDemos } from './CatalogEngineDemo';
import { DemoProfileLauncher } from './DemoProfileLauncher';
import './demo-videos.css';
import { DemoToolPanel, PushDown } from './DemoToolPanel';
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

  // The first tool shows until the visitor picks another; picking never scrolls the page away.
  const current = picked ?? START_HERE[0];

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

          {/* One frame: pick a tool from the tabs and the same panel shows it — no card grid. */}
          <div className="demo-start" ref={pickedRef}>
            <div className="demo-start-tabs" role="tablist" aria-label="Tools to start with">
              {START_HERE.map((tool) => (
                <button
                  key={tool.code}
                  type="button"
                  role="tab"
                  className="demo-start-tab"
                  aria-selected={current.code === tool.code}
                  aria-controls="demo-start-panel"
                  onClick={() => setPicked(tool)}
                >
                  <strong>{tool.name}</strong>
                  <span>
                    <Clock aria-hidden="true" size={12} /> ~{tool.minutes} min
                  </span>
                </button>
              ))}
            </div>
            <div className="demo-start-panel" id="demo-start-panel" role="tabpanel">
              <PushDown key={current.code} reduced={reduced}>
                <DemoToolPanel tool={current} startOpen />
              </PushDown>
            </div>
          </div>
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
