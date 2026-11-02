import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { Link } from 'react-router-dom';
import { UserGuide } from './UserGuide';
import { PillarLoop } from '../../../../shared/visuals/PillarLoop';
import '../product/product.css';
import '../motion.css';
import './guide-page.css';
import {
  GuidesHeroSlide,
  GuideFormatsSlide1,
  RunABetterWeeklyReviewSlide2,
  PutTheGuideToWorkSlide3,
} from './slides';

/** /guides — sections in reading order. */
const extras = [
  { title: 'Guide formats', text: 'Decision frameworks, capability maps and review templates.' },
  {
    title: 'Run a better weekly review',
    text: 'Check movement, blockers, capability needs and next priorities.',
  },
  {
    title: 'Put the guide to work',
    text: 'Each guide links the framework to a practical next step.',
  },
];

function GuidePage() {
  return (
    <div className="prod-page guide-page">
      <section className="gp-hero">
        <div>
          <p className="gp-eyebrow">Guides</p>
          <h1>Your LAMID ONE user guide.</h1>
          <p className="gp-lede">
            Step-by-step help with the demo, signup, workspace tools, learning, points and
            troubleshooting.
          </p>
          <div className="gp-actions">
            <a className="prod-btn prod-btn-solid" href="#user-guide-title">
              Browse the guide
            </a>
            <Link className="prod-btn prod-btn-outline" to="/signup">
              Get started
            </Link>
          </div>
        </div>
        <div className="gp-visual">
          <PillarLoop />
        </div>
      </section>

      <UserGuide />

      <section className="guide-extras" aria-label="More ways to use the guide">
        {extras.map((item) => (
          <article key={item.title}>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </section>

      <section className="prod-close">
        <h2>Still stuck? Talk to us.</h2>
        <div className="prod-actions">
          <Link className="prod-btn prod-btn-light" to="/contact">
            Get a demo
          </Link>
          <Link className="prod-btn prod-btn-ghost" to="/help">
            Visit help
          </Link>
        </div>
      </section>
    </div>
  );
}

export function GuidesDocumentPage({ embedded = false }: DocumentPageProps) {
  if (!embedded) return <GuidePage />;
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<GuidesHeroSlide embedded={embedded} />}
    >
      <UserGuide />
      <GuideFormatsSlide1 embedded={embedded} />
      <RunABetterWeeklyReviewSlide2 embedded={embedded} />
      <PutTheGuideToWorkSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
