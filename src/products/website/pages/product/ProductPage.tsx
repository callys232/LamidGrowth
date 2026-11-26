import { Link } from 'react-router-dom';
import {
  ChartNoAxesCombined,
  ChevronRight,
  ClipboardCheck,
  Compass,
  MessagesSquare,
  ShieldCheck,
  Sprout,
  UsersRound,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { pillars } from '../../../../shared/brand';
import { platformMessaging } from '../../../../shared/brand/platformMessaging';
import content from './content.json';
import './product.css';
import './product-showcase.css';
import '../motion.css';

const suiteDirectory = [
  {
    name: 'Strategy',
    pillar: 'Clarity',
    href: '/product/strategy',
    thumb: '/media/suites/strategy-3d.jpg',
    icon: Compass,
    line: 'Set a clear direction and verify active initiatives and spend follow it.',
    highlights: ['Purpose & Strategic Direction', 'Strategy Alignment Matrix', 'Strategic Priority Ranking'],
  },
  {
    name: 'Decisions',
    pillar: 'Clarity',
    href: '/product/decisions',
    thumb: '/media/suites/decisions-3d.jpg',
    icon: ClipboardCheck,
    line: 'Decentralize authority, score decision quality, and clear stalled calls.',
    highlights: ['Decision Quality (DQ)', 'Decision Register', 'Scenarios & Expected Value'],
  },
  {
    name: 'People & Skills',
    pillar: 'Capability',
    href: '/product/people',
    thumb: '/media/suites/people-3d.jpg',
    icon: UsersRound,
    line: 'Close critical capability gaps, plan workforce capacity, and secure bench depth.',
    highlights: ['Skills Gap Analysis', 'Workforce Plan', 'Succession & Bench Strength'],
  },
  {
    name: 'Operations',
    pillar: 'Capability',
    href: '/product/operations',
    thumb: '/media/suites/operations-3d.jpg',
    icon: Workflow,
    line: 'Balance workloads, break delivery bottlenecks, and separate drift from noise.',
    highlights: ['Delivery Flow Metrics', 'Drift & Stability (XmR)', 'Workload & Capacity Balance'],
  },
  {
    name: 'Finance',
    pillar: 'Growth',
    href: '/product/finance',
    thumb: '/media/suites/finance-3d.jpg',
    icon: ChartNoAxesCombined,
    line: 'Project 13-week cash runway, model valuation, and trace ROE drivers.',
    highlights: ['13-Week Direct Cash Forecast', 'KPI Driver Tree (DuPont)', 'DCF Business Valuation'],
  },
  {
    name: 'Risk & Governance',
    pillar: 'Consistency',
    href: '/product/risk-governance',
    thumb: '/media/suites/risk-governance-3d.jpg',
    icon: ShieldCheck,
    line: 'Spot KRI breaches early, govern risk appetite, and verify continuity controls.',
    highlights: ['Early Warning Indicators', 'ISO 31000 Risk Register', 'Business Continuity (BIA)'],
  },
  {
    name: 'Growth & Change',
    pillar: 'Growth',
    href: '/product/growth-change',
    thumb: '/media/suites/growth-change-3d.jpg',
    icon: Sprout,
    line: 'Balance 3-Horizon bets, sequence growth pathways, and remove ADKAR barriers.',
    highlights: ['3-Horizon Opportunity Scoring', 'Growth Pathways', 'Change Readiness'],
  },
  {
    name: 'Expert Advisory',
    pillar: 'Consistency',
    href: '/product/advisory',
    thumb: '/media/suites/advisory-3d.jpg',
    icon: MessagesSquare,
    line: 'Engage vetted fractional executives with milestone escrow governance.',
    highlights: ['Fractional C-Suite Leadership', 'Milestone Escrow Governance', 'Independent Peer Review'],
  },
] as const;

const faqs = [
  {
    q: 'What is an engine?',
    a: 'A guided decision engine for one job, such as comparing options or checking skills gaps. You answer structured questions and it scores them, then shows you the auditable math it used.',
  },
  {
    q: 'Does the platform make decisions for me?',
    a: 'Continuous intelligence gathers relevant context, surfaces patterns and options, and explains how recommendations were prepared. You review and approve before acting.',
  },
  {
    q: 'Can I bring an adviser into the work?',
    a: 'Yes. Advisers can join with the relevant context so you can discuss the objective, evidence, and next step together.',
  },
];

export function ProductPage() {
  return (
    <div className="prod-page">
      <section className="prod-hero">
        <nav className="ps-crumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link> <span aria-hidden="true">›</span> <span>Product</span>
        </nav>
        <p className="prod-eyebrow">The LAMID ONE platform</p>
        <h1>
          <span>Decide what matters.</span>
          <br />
          <span>Build what’s needed.</span>
          <br />
          <span>Deliver the work.</span>
        </h1>
        <p className="prod-lede">{platformMessaging.description}</p>
        <div className="prod-actions">
          <Link className="prod-btn prod-btn-solid" to={platformMessaging.visitorPaths[0].href}>
            {platformMessaging.visitorPaths[0].label}
          </Link>
          <Link className="prod-btn prod-btn-outline" to={platformMessaging.visitorPaths[1].href}>
            {platformMessaging.visitorPaths[1].label}
          </Link>
        </div>
        <p className="prod-human-control">{platformMessaging.humanControl}</p>
      </section>

      <section className="ps-intro" aria-labelledby="ps-intro-title">
        <div className="ps-intro-heading">
          <div className="ps-intro-row">
            <h2 id="ps-intro-title">{content.platformIntro.title}</h2>
            <p>{content.platformIntro.description}</p>
          </div>
        </div>
        <ul className="ps-pillars">
          {pillars.map((pillar) => (
            <li key={pillar.id} data-pillar={pillar.id}>
              <div className="ps-pillar-copy">
                <span className="ps-pillar-verb">{pillar.verb}</span>
                <h3>{pillar.name}</h3>
              </div>
              <p>{pillar.tagline}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="ps-directory" aria-labelledby="ps-directory-title">
        <div className="ps-directory-head">
          <h2 id="ps-directory-title">Explore each suite in depth.</h2>
          <p>Pick a suite to explore live dashboards, simulators, and playbooks.</p>
        </div>
        <div className="ps-directory-grid">
          {suiteDirectory.map((suite) => {
            const Icon: LucideIcon = suite.icon;
            return (
              <Link key={suite.href} to={suite.href} className="ps-dir-card">
                <div className="ps-dir-thumb" aria-hidden="true">
                  <img src={suite.thumb} alt="" loading="lazy" decoding="async" />
                </div>
                <div className="ps-dir-top">
                  <span className="ps-feature-icon" aria-hidden="true">
                    <Icon size={20} strokeWidth={1.7} />
                  </span>
                  <span className="ps-dir-pillar">{suite.pillar}</span>
                </div>
                <h3>{suite.name}</h3>
                <p>{suite.line}</p>
                <ul className="ps-dir-highlights" data-scroll-feedback="off">
                  {suite.highlights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <span className="ps-dir-link">
                  Explore {suite.name} suite <ChevronRight size={15} aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="prod-faq" aria-labelledby="prod-faq-title">
        <h2 id="prod-faq-title">Questions</h2>
        {faqs.map((item) => (
          <details key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </section>

      <section className="prod-close">
        <h2>See it on your own work.</h2>
        <div className="prod-actions">
          <Link className="prod-btn prod-btn-light" to="/contact">
            Get a demo
          </Link>
          <Link className="prod-btn prod-btn-ghost" to="/pricing">
            See pricing
          </Link>
        </div>
      </section>
    </div>
  );
}
