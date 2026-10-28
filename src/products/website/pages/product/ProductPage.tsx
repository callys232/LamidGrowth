import { Link } from 'react-router-dom';
import {
  Activity,
  BadgeCheck,
  ChartNoAxesColumnIncreasing,
  ChartNoAxesCombined,
  CircleHelp,
  ClipboardCheck,
  ClipboardList,
  Compass,
  GitBranch,
  GitCompareArrows,
  Gauge,
  ArrowUpNarrowWide,
  Scale,
  ScanSearch,
  SearchCheck,
  ShieldAlert,
  Siren,
  TrendingUp,
  UserRoundSearch,
  UsersRound,
  WalletCards,
  Waypoints,
  type LucideIcon,
} from 'lucide-react';
import { pillars } from '../../../../shared/brand';
import { platformMessaging } from '../../../../shared/brand/platformMessaging';
import content from './content.json';
import './product.css';
import './product-showcase.css';
import '../motion.css';
import { MoreDetail } from '../../../../shared/content/MoreDetail';

// Engines are grouped by the job they do, using the working engine catalogue's own areas.
const jobs = [
  {
    name: 'Strategy',
    clip: 'S01',
    line: 'Set a clear direction and check the work follows it.',
    examples: [
      'Purpose & Strategic Direction',
      'Strategy Alignment Matrix',
      'Strategic Priority Ranking',
    ],
  },
  {
    name: 'Decisions',
    clip: 'Q02',
    line: 'Compare options and record why you chose.',
    examples: ['Decision Register', 'Option Comparison', 'Scenarios & Expected Value'],
  },
  {
    name: 'People',
    clip: 'A02',
    line: 'See skills, gaps and the next step for each person.',
    examples: ['Skills Gap Analysis', 'Workforce Plan', 'Succession & Bench Strength'],
  },
  {
    name: 'Operations',
    clip: 'R05',
    line: 'Find bottlenecks and keep delivery steady.',
    examples: ['Workload & Capacity Balance', 'Delivery Flow Metrics', 'Root Cause Analysis'],
  },
  {
    name: 'Finance',
    clip: 'F03',
    line: 'Understand cash, cost and what drives results.',
    examples: ['Rolling Forecast & 13-Week Cash', 'KPI Driver Tree', 'Cost & Spend Analysis'],
  },
  {
    name: 'Risk & Governance',
    clip: 'Q43',
    line: 'Spot problems early and keep accountability clear.',
    examples: ['Risk Register', 'Early Warning Indicators', 'Governance Assessment'],
  },
  {
    name: 'Growth & Change',
    clip: 'G03',
    line: 'Score opportunities and plan the change.',
    examples: ['Growth Pathways', 'Growth Opportunity Scoring', 'Change Readiness'],
  },
] as const;

const exampleIcons: Record<string, LucideIcon> = {
  'Purpose & Strategic Direction': Compass,
  'Strategy Alignment Matrix': GitCompareArrows,
  'Strategic Priority Ranking': ArrowUpNarrowWide,
  'Decision Register': ClipboardList,
  'Option Comparison': Scale,
  'Scenarios & Expected Value': ChartNoAxesCombined,
  'Skills Gap Analysis': UserRoundSearch,
  'Workforce Plan': UsersRound,
  'Succession & Bench Strength': BadgeCheck,
  'Workload & Capacity Balance': Gauge,
  'Delivery Flow Metrics': Activity,
  'Root Cause Analysis': ScanSearch,
  'Rolling Forecast & 13-Week Cash': WalletCards,
  'KPI Driver Tree': ChartNoAxesColumnIncreasing,
  'Cost & Spend Analysis': SearchCheck,
  'Risk Register': ShieldAlert,
  'Early Warning Indicators': Siren,
  'Governance Assessment': ClipboardCheck,
  'Growth Pathways': Waypoints,
  'Growth Opportunity Scoring': TrendingUp,
  'Change Readiness': GitBranch,
};

const toolNotes: Record<string, string> = {
  'Purpose & Strategic Direction':
    'Checks that your purpose, values and priorities are clear, shared and used in decisions.',
  'Strategy Alignment Matrix':
    'Links objectives to the work and spend under way, so you see what serves no objective.',
  'Strategic Priority Ranking':
    'Ranks priorities against weighted criteria and shows how sensitive the ranking is.',
  'Decision Register':
    'Records decisions and tracks stalled ones, missing owners and overdue reviews.',
  'Option Comparison':
    'Scores options against weighted criteria and shows how fragile the winner is.',
  'Scenarios & Expected Value':
    'Compares options across possible futures and what better information is worth.',
  'Skills Gap Analysis':
    'Compares required and current skills by role and finds skills held by one person.',
  'Workforce Plan':
    'Compares future demand with projected supply and sets a hire or develop route.',
  'Succession & Bench Strength': 'Measures succession cover for each critical seat.',
  'Workload & Capacity Balance':
    'Compares demand with capacity and suggests where spare capacity can absorb overload.',
  'Delivery Flow Metrics': 'Measures throughput, cycle time, work in progress and flow efficiency.',
  'Root Cause Analysis':
    'Tests candidate causes against the evidence to find what is behind a problem.',
  'Rolling Forecast & 13-Week Cash':
    'Projects cash week by week for 13 weeks, and revenue, cost and cash for 12 months.',
  'KPI Driver Tree': 'Breaks return on equity into margin, turnover and leverage.',
  'Cost & Spend Analysis': 'Finds the few cost lines behind most spend, and the fastest growing.',
  'Risk Register': 'Keeps risks with owners and controls, and shows those above appetite.',
  'Early Warning Indicators':
    'Tracks leading indicators against thresholds and shows how soon they will breach.',
  'Governance Assessment': 'Assesses governance against recognised principles, with evidence.',
  'Growth Pathways': 'Compares pathways and returns a sequenced portfolio that fits your capacity.',
  'Growth Opportunity Scoring':
    'Ranks opportunities and shows how effort is spread across three horizons.',
  'Change Readiness': 'Finds each affected group’s barrier so effort goes where change is stuck.',
};

const about: Record<string, string> = {
  Strategy:
    'Use these when direction is unclear or the work no longer matches the plan. They test whether purpose and priorities are shared, and connect objectives to the initiatives and spend behind them.',
  Decisions:
    'Use these when choices stall or repeat. They keep a record of what was decided and why, compare options on the criteria you set, and show how sure you can be of the answer.',
  People:
    'Use these to see what skills you have, where the gaps are and who could step into key roles. They turn people planning into a clear next step for each role.',
  Operations:
    'Use these when delivery feels slow or uneven. They show where work waits, whether demand fits capacity, and what is really behind a recurring problem.',
  Finance:
    'Use these to see cash, cost and what drives results. They project cash ahead, trace results back to their drivers and point to the spend that matters most.',
  'Risk & Governance':
    'Use these to catch problems early and keep accountability clear. They record risks with owners, watch warning signs against thresholds and assess governance with evidence.',
  'Growth & Change':
    'Use these to choose where to grow and plan the change that comes with it. They rank opportunities, sequence the pathways and show where a change is likely to stall.',
};

const faqs = [
  {
    q: 'What is an engine?',
    a: 'A guided tool for one job, such as comparing options or checking skills gaps. You answer questions and it scores them, then shows you the method it used.',
  },
  {
    q: 'Does the AI make decisions for me?',
    a: 'AI gathers relevant context, surfaces patterns and options, and explains how recommendations were prepared. You review before acting.',
  },
  {
    q: 'Can I bring an adviser into the work?',
    a: 'Yes. Advisers can join with the relevant context so you can discuss the objective, evidence, and next step together.',
  },
];

function playVideo(event: { currentTarget: HTMLElement }) {
  const video = event.currentTarget.querySelector('video');
  if (video && video.paused) void video.play().catch(() => undefined);
}

export function ProductPage() {
  return (
    <div className="prod-page">
      <section className="prod-hero">
        <nav className="ps-crumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link> <span aria-hidden="true">›</span> <span>Product</span>
        </nav>
        <p className="prod-eyebrow">The LamidOne platform</p>
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
          <span className="ps-tag">{content.platformIntro.label}</span>
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

      {jobs.map((job, index) => {
        return (
          <section
            className={`ps-block${index % 2 ? ' ps-block-flip' : ''}`}
            key={job.name}
            aria-labelledby={`ps-${index}`}
          >
            <div className="ps-block-row">
              <div className="ps-visual" onMouseEnter={playVideo} onFocus={playVideo} tabIndex={0}>
                <video
                  muted
                  loop
                  playsInline
                  preload="none"
                  poster={`/media/posters/${job.clip}.svg`}
                  aria-label={`${job.name} tool in use`}
                >
                  <source src={`/videos/engines/${job.clip}.webm`} type="video/webm" />
                  <source src={`/videos/engines/${job.clip}.mp4`} type="video/mp4" />
                </video>
              </div>
              <div className="ps-text">
                <h2 id={`ps-${index}`}>{job.name}</h2>
                <p>{job.line}</p>
                <p className="ps-about">{about[job.name]}</p>
                <Link to="/demo">Try {job.name.toLowerCase()} tools →</Link>
              </div>
            </div>
            <ul className="ps-features">
              {job.examples.map((example) => {
                const Icon = exampleIcons[example] ?? CircleHelp;
                return (
                  <li key={example}>
                    <span className="ps-feature-icon" aria-hidden="true">
                      <Icon size={23} strokeWidth={1.6} />
                    </span>
                    <div>
                      <h3>{example}</h3>
                      <p>{toolNotes[example]}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <section className="prod-faq" aria-labelledby="prod-faq-title">
        <h2 id="prod-faq-title">Questions</h2>
        {faqs.map((item) => (
          <details key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </section>

      <MoreDetail page={{ sections: content.sections }} heading="How the platform works" />

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
