import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useReducedMotion } from 'motion/react';
import { ArrowDown, Check, ChevronDown, Clock } from 'lucide-react';
import { networkApi } from '../../../../api';
import { DemoVideoPlayer } from './DemoVideoPlayer';
import { DemoVideoLibrary } from './DemoVideoLibrary';
import { AllEngineDemos } from './CatalogEngineDemo';
import { DemoProfileLauncher } from './DemoProfileLauncher';
import './demo-videos.css';
import { DemoToolPanel, PushDown } from './DemoToolPanel';
import { HERO_TOOL, START_HERE, type FeaturedTool } from './featuredTools';
import '../../../engines/pages/engines-page.css';
import './demo-tools.css';

/** Public demo: live, uncharged engine trials come first. The optional saved sample workspace
 * below has its own email-verification step; it does not gate these standalone engine runs. */
export function DemoToolsPage() {
  const heroToolRef = useRef<HTMLElement>(null);
  const pickedRef = useRef<HTMLDivElement>(null);
  const [picked, setPicked] = useState<FeaturedTool | null>(null);
  const [requestStatus, setRequestStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [requestError, setRequestError] = useState('');
  const [requestedEmail, setRequestedEmail] = useState('');
  const reduced = useReducedMotion();

  // The first engine shows until the visitor picks another; picking never scrolls the page away.
  const current = picked ?? START_HERE[0];

  async function handleDemoRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') ?? '').trim();
    setRequestStatus('sending');
    setRequestError('');

    try {
      await networkApi('/demo/register', {
        name: String(data.get('name') ?? '').trim(),
        email,
        tier: String(data.get('size') ?? '1-10'),
        followup: data.get('followup') === 'on',
      });
      setRequestedEmail(email);
      setRequestStatus('sent');
    } catch (error) {
      setRequestError(
        error instanceof Error
          ? error.message
          : 'Could not send your demo link right now. Please try again.'
      );
      setRequestStatus('error');
    }
  }

  return (
    <div className="demo-tools-page" data-scroll-feedback="off">
      <section id="demo-player" className="demo-slide demo-hero">
        <div className="demo-tools-container demo-hero-grid">
          <div className="demo-hero-copy">
            <span className="demo-tools-eyebrow">Free product demo</span>
            <h1>Get a free demo of LAMID ONE.</h1>
            <p>
              See how our connected growth engines, live diagnostics, and human advisory workflows
              help you make clearer decisions and execute faster.
            </p>
            <ul className="demo-hero-benefits">
              <li>
                <Check aria-hidden="true" size={16} />
                <span>Run live diagnostics right away with zero setup or account required</span>
              </li>
              <li>
                <Check aria-hidden="true" size={16} />
                <span>Explore real workflows tailored to your team size and role</span>
              </li>
              <li>
                <Check aria-hidden="true" size={16} />
                <span>Get a personal demo link delivered straight to your inbox</span>
              </li>
            </ul>
            <div className="demo-hero-actions">
              <button
                type="button"
                className="button button-primary"
                onClick={() =>
                  heroToolRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              >
                Try a live engine now <ArrowDown aria-hidden="true" size={16} />
              </button>
              <a className="demo-hero-link" href="#profile-demos">
                Or explore by role
              </a>
            </div>
          </div>

          <div className="demo-request-card" aria-labelledby="demo-request-heading">
            <h2 id="demo-request-heading">Get your personal demo link</h2>
            <p className="demo-request-sub">
              Enter your details to receive a direct link you can revisit anytime.
            </p>

            {requestStatus === 'sent' ? (
              <div className="demo-request-sent" role="status">
                <h3>Check your inbox.</h3>
                <p>
                  We sent your personal demo link to <strong>{requestedEmail}</strong>. Open it
                  whenever you are ready, or jump straight into a live diagnostic below.
                </p>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setRequestStatus('idle')}
                >
                  Request another link
                </button>
              </div>
            ) : (
              <form className="demo-request-form" onSubmit={handleDemoRequest}>
                <div className="demo-request-field">
                  <label htmlFor="demo-req-name">Full name</label>
                  <input
                    id="demo-req-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Adaeze Okafor"
                    required
                  />
                </div>
                <div className="demo-request-field">
                  <label htmlFor="demo-req-email">Business email</label>
                  <input
                    id="demo-req-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    required
                  />
                </div>
                <div className="demo-request-field">
                  <label htmlFor="demo-req-size">Organization size</label>
                  <select id="demo-req-size" name="size" defaultValue="1-10">
                    <option value="1-10">1 - 10 people</option>
                    <option value="11-50">11 - 50 people</option>
                    <option value="51-250">51 - 250 people</option>
                    <option value="251+">251+ people</option>
                  </select>
                </div>
                <label className="demo-request-check">
                  <input type="checkbox" name="followup" />
                  <span>Send me a 2-day reminder if I do not finish</span>
                </label>
                {requestStatus === 'error' && requestError && (
                  <p className="demo-request-error" role="alert">
                    {requestError}
                  </p>
                )}
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={requestStatus === 'sending'}
                >
                  {requestStatus === 'sending' ? 'Sending...' : 'Get my demo link'}
                </button>
                <p className="demo-request-privacy">
                  We respect your privacy and use your details only to send your demo link.{' '}
                  <Link to="/legal/privacy">Privacy policy</Link>.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      <section className="demo-trust-strip" aria-label="Platform highlights">
        <div className="demo-tools-container demo-trust-grid">
          <div className="demo-trust-item">
            <strong>Since 1988</strong>
            <span>Decades of real-world advisory frameworks</span>
          </div>
          <div className="demo-trust-item">
            <strong>Live Intelligence</strong>
            <span>Interactive diagnostics you can test today</span>
          </div>
          <div className="demo-trust-item">
            <strong>Escrow Advisory</strong>
            <span>Built-in accountability for every milestone</span>
          </div>
          <div className="demo-trust-item">
            <strong>100% Human</strong>
            <span>Real advisers alongside clear systems</span>
          </div>
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
            <h2>Choose another engine to try</h2>
            <p>
              Each one is quick, runs for real, and answers a question you probably already have.
            </p>
          </div>

          {/* One frame: pick a tool from the tabs and the same panel shows it — no card grid. */}
          <div className="demo-start" ref={pickedRef}>
            <div className="demo-start-tabs" role="tablist" aria-label="Engines to start with">
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
      <section className="demo-slide">
        <div className="demo-tools-container">
          <DemoVideoLibrary />
        </div>
      </section>
      <section id="profile-demos" className="demo-slide demo-slide-alt">
        <div className="demo-tools-container">
          <DemoProfileLauncher />
        </div>
      </section>
      <section className="demo-slide demo-faq" aria-labelledby="demo-faq-heading">
        <div className="demo-tools-container">
          <div className="demo-section-head">
            <span className="demo-tools-eyebrow">Common questions</span>
            <h2 id="demo-faq-heading">Frequently asked questions</h2>
          </div>
          <div className="demo-faq-list">
            <details className="demo-faq-item">
              <summary>
                <span>What happens after I request a demo link?</span>
                <ChevronDown className="demo-faq-chevron" aria-hidden="true" size={18} />
              </summary>
              <p>
                We send a personal link straight to your inbox so you can open your guided demo
                whenever you are ready, with no sales pressure.
              </p>
            </details>
            <details className="demo-faq-item">
              <summary>
                <span>Can I try LAMID ONE without signing up?</span>
                <ChevronDown className="demo-faq-chevron" aria-hidden="true" size={18} />
              </summary>
              <p>
                Yes. Every live diagnostic and role preview on this page runs immediately with zero
                account setup and nothing charged.
              </p>
            </details>
            <details className="demo-faq-item">
              <summary>
                <span>How does organization size affect my demo?</span>
                <ChevronDown className="demo-faq-chevron" aria-hidden="true" size={18} />
              </summary>
              <p>
                It helps us tailor your guided workspace examples and advisory cadence to match
                whether you lead a lean team or a larger multi-unit organization.
              </p>
            </details>
            <details className="demo-faq-item">
              <summary>
                <span>Is my demo data saved or shared?</span>
                <ChevronDown className="demo-faq-chevron" aria-hidden="true" size={18} />
              </summary>
              <p>
                No. Public diagnostics run in your browser without saving your inputs, and your
                contact email is only used to deliver the demo link you requested.
              </p>
            </details>
          </div>
        </div>
      </section>

      <section className="demo-slide demo-closing">
        <div className="demo-tools-container">
          <h2>Save your results and unlock everything.</h2>
          <p>Your own workspace, every diagnostic, and results that build on each other.</p>
          <div className="demo-closing-actions">
            <Link className="button button-primary" to="/signup">
              Create your account
            </Link>
            <Link className="button button-secondary" to="/pricing">
              See pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
