import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import './demo-video-library.css';

const tours = [
  {
    id: 'clarity',
    title: 'Clarity',
    tool: 'OKR & Strategy Execution Review',
    description: 'See progress against objectives and compare it with the time elapsed.',
    code: 'S06',
  },
  {
    id: 'capability',
    title: 'Capability',
    tool: 'Skills Gap Analysis',
    description:
      'Compare required and current skills, coverage, and skills held by only one person.',
    code: 'A02',
  },
  {
    id: 'consistency',
    title: 'Consistency',
    tool: 'Delivery Flow Metrics',
    description: 'Review throughput, cycle time, work in progress, and flow efficiency.',
    code: 'R02',
  },
  {
    id: 'growth',
    title: 'Growth',
    tool: 'Growth Opportunity Scoring',
    description: 'Rank opportunities using reach, impact, confidence, and effort.',
    code: 'Z01',
  },
  {
    id: 'rhythm',
    title: 'Rhythm',
    tool: 'Operating Rhythm & Meeting Design',
    description: 'Review meeting time, status updates, and missing review cadences.',
    code: 'S05',
  },
  {
    id: 'integrations',
    title: 'Integrations',
    tool: 'Slack & Salesforce connections',
    description:
      'Follow account authorization, a read-only snapshot import, and a review of connected data.',
    code: '',
  },
];

export function DemoVideoLibrary({ primary = false }: { primary?: boolean }) {
  const Heading = primary ? 'h1' : 'h2';
  const [params, setParams] = useSearchParams();
  const [failed, setFailed] = useState(false);
  const selected = tours.find((t) => t.id === params.get('tour')) || tours[0];
  return (
    <section className="demo-video-library" id="demo-player" aria-labelledby="demo-library-title">
      <header>
        <span className="demo-video-kicker">WATCH IT IN ACTION</span>
        <Heading id="demo-library-title">Choose a video walkthrough</Heading>
        <p>No sign-in needed. Explore a sample walkthrough, then choose your next step.</p>
      </header>
      <div className="demo-video-selector" role="group" aria-label="Choose a demo video">
        {tours.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={t.id === selected.id}
            onClick={() => {
              setFailed(false);
              setParams({ tour: t.id }, { preventScrollReset: true });
            }}
          >
            {t.title}
          </button>
        ))}
      </div>
      <div className="demo-video-stage">
        <div className="demo-video-screen">
          {failed ? (
            <div className="demo-video-error" role="alert">
              The video could not load.{' '}
              <button
                type="button"
                onClick={() => {
                  setFailed(false);
                }}
              >
                Try again
              </button>
            </div>
          ) : (
            <video
              key={selected.id}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-label={`${selected.tool} sample video demo`}
              onError={() => setFailed(true)}
            >
              <source src={`/videos/${selected.id}-demo.webm`} type="video/webm" />
            </video>
          )}
        </div>
        <aside>
          <span className="demo-video-kicker">{selected.title} DEMO</span>
          <h3>{selected.tool}</h3>
          <p>{selected.description}</p>
          <p className="demo-video-disclosure">
            {selected.id === 'integrations'
              ? 'Illustrative connection flow with sample data. Live connections require provider authorization and administrator setup.'
              : 'Illustrative data shown in a sample walkthrough. Engine demos use calculations from the implemented engines.'}
          </p>
          <Link
            className="button button-primary"
            to={
              selected.id === 'integrations'
                ? '/os/integrations'
                : `/os/engines${selected.code ? `?engine=${selected.code}` : ''}`
            }
          >
            {selected.id === 'integrations' ? 'Connect your services' : 'Try the engines'}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
          <Link className="demo-guided-link" to={`/demo/request?tour=${selected.id}`}>
            Request a guided demo
          </Link>
        </aside>
      </div>
    </section>
  );
}
