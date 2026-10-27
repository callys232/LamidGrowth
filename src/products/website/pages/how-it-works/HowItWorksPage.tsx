import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../motion.css';
import { MoreDetail } from '../../../../shared/content/MoreDetail';
import './how-it-works.css';
import { WorkflowArt } from './WorkflowArt';

type Step = { title: string; line: string };
type Engine = { name: string; clip: string };
export interface HowItWorksContent {
  id: string;
  group?: 'product';
  eyebrow: string;
  title: string;
  lede: string;
  steps: readonly [Step, Step, Step];
  tourTitle: string;
  engines: readonly Engine[];
  cta: { label: string; to: string };
}

const cycle = [
  { id: 'overview', label: 'Overview', to: '/how-it-works' },
  { id: 'clarity', label: 'Clarity', to: '/how-it-works/clarity' },
  { id: 'capability', label: 'Capability', to: '/how-it-works/capability' },
  { id: 'consistency', label: 'Consistency', to: '/how-it-works/consistency' },
  { id: 'growth', label: 'Growth', to: '/how-it-works/growth' },
  { id: 'rhythm', label: 'Rhythm', to: '/how-it-works/rhythm' },
] as const;

const productNav = [
  { id: 'product', label: 'Platform', to: '/product' },
  { id: 'companion', label: 'Companion', to: '/product/companion' },
  { id: 'experience', label: 'Experience', to: '/product/experience' },
  { id: 'intelligence', label: 'Intelligence', to: '/product/intelligence' },
  { id: 'workflows', label: 'Workflows', to: '/product/workflows' },
  { id: 'organizations', label: 'Organisations', to: '/product/organizations' },
] as const;

export const howItWorks: Record<string, HowItWorksContent> = {
  companion: {
    id: 'companion',
    group: 'product',
    eyebrow: 'Growth Companion',
    title: 'Work with the situation in front of you.',
    lede: 'The Companion turns your goal and context into clearer understanding, better decisions and practical next steps.',
    steps: [
      { title: 'Start with intent', line: 'Say what you want to achieve.' },
      { title: 'Context first', line: 'It reads your situation before it suggests anything.' },
      { title: 'Action next', line: 'You get a practical step, and you stay in control.' },
    ],
    tourTitle: 'The Companion at work',
    engines: [
      { name: 'Decision Quality', clip: 'Q44' },
      { name: 'Decision Method Selector', clip: 'Q35' },
      { name: 'Scenarios & Expected Value', clip: 'Q03' },
    ],
    cta: { label: 'Get started', to: '/signup' },
  },
  experience: {
    id: 'experience',
    group: 'product',
    eyebrow: 'The experience',
    title: 'Calm, clear and human.',
    lede: 'One space where growth feels manageable, shaped around the work you do.',
    steps: [
      { title: 'Calm', line: 'Structured and doable, never overwhelming.' },
      { title: 'Guided', line: 'Each screen asks one clear question.' },
      { title: 'Yours', line: 'The same platform, shaped for different kinds of work.' },
    ],
    tourTitle: 'See it in use',
    engines: [
      { name: 'Purpose & Strategic Direction', clip: 'S01' },
      { name: 'Option Comparison', clip: 'Q21' },
      { name: 'KPI Driver Tree', clip: 'F03' },
    ],
    cta: { label: 'Try the demo', to: '/demo' },
  },
  intelligence: {
    id: 'intelligence',
    group: 'product',
    eyebrow: 'Intelligence',
    title: 'Quiet intelligence that supports your direction.',
    lede: 'It suggests, explains and prepares. People decide.',
    steps: [
      { title: 'Guides', line: 'Help without taking over.' },
      { title: 'Adapts', line: 'The depth matches the decision in front of you.' },
      { title: 'Explains', line: 'Every result shows the method behind it.' },
    ],
    tourTitle: 'Intelligence in use',
    engines: [
      { name: 'Scenarios & Expected Value', clip: 'Q03' },
      { name: 'Forecast Calibration', clip: 'Q27' },
      { name: 'Early Warning Indicators', clip: 'Q15' },
    ],
    cta: { label: 'Try the demo', to: '/demo' },
  },
  workflows: {
    id: 'workflows',
    group: 'product',
    eyebrow: 'Workflows',
    title: 'Move from insight to action.',
    lede: 'Connect decisions to the work, from one clear next step to a structured workflow.',
    steps: [
      { title: 'Start simple', line: 'Begin with a single next action.' },
      { title: 'Repeat what works', line: 'Turn a good routine into a repeatable one.' },
      { title: 'Stay in bounds', line: 'Progress happens inside limits you set.' },
    ],
    tourTitle: 'Workflows in use',
    engines: [
      { name: 'Bottleneck & Process Improvement', clip: 'P14' },
      { name: 'Dependency Board', clip: 'R06' },
      { name: 'Root Cause Analysis', clip: 'R25' },
    ],
    cta: { label: 'Get started', to: '/signup' },
  },
  organizations: {
    id: 'organizations',
    group: 'product',
    eyebrow: 'For organisations',
    title: 'From individual clarity to shared direction.',
    lede: 'Extend the same method across teams while keeping each person’s view clear.',
    steps: [
      { title: 'Shared context', line: 'Everyone works from the same picture.' },
      { title: 'Shared rhythm', line: 'One cadence for planning and review.' },
      { title: 'Governance', line: 'Clear accountability, with a record of decisions.' },
    ],
    tourTitle: 'Organisation tools in use',
    engines: [
      { name: 'Governance Assessment', clip: 'Q99' },
      { name: 'Decision Rights Matrix', clip: 'Q29' },
      { name: 'Operating Model Review', clip: 'C06' },
    ],
    cta: { label: 'Talk to our team', to: '/contact' },
  },
  overview: {
    id: 'overview',
    eyebrow: 'How it works',
    title: 'See clearly. Build what’s needed. Deliver steadily.',
    lede: 'Every kind of growth follows the same three moves. LamidOne guides you through them, one step at a time.',
    steps: [
      { title: 'Decide', line: 'Understand the situation and choose what matters.' },
      { title: 'Build', line: 'Strengthen the people, skills and plans the next step needs.' },
      { title: 'Deliver', line: 'Keep the work moving with a steady rhythm and regular review.' },
    ],
    tourTitle: 'The method, in use',
    engines: [
      { name: 'Decide', clip: 'Q21' },
      { name: 'Build', clip: 'A02' },
      { name: 'Deliver', clip: 'R05' },
    ],
    cta: { label: 'Get started', to: '/signup' },
  },
  clarity: {
    id: 'clarity',
    eyebrow: 'Clarity · Decide',
    title: 'See the situation more clearly.',
    lede: 'Before choosing what to do, understand what matters, what is changing and what is in the way.',
    steps: [
      { title: 'Reduce noise', line: 'Separate the important from the merely urgent.' },
      {
        title: 'Understand context',
        line: 'Bring priorities, assumptions and constraints into view.',
      },
      { title: 'Reveal patterns', line: 'Spot the recurring issues scattered information hides.' },
    ],
    tourTitle: 'Clarity tools in use',
    engines: [
      { name: 'Option Comparison', clip: 'Q21' },
      { name: 'Decision Register', clip: 'Q02' },
      { name: 'Strategic Priority Ranking', clip: 'S09' },
    ],
    cta: { label: 'Try Clarity', to: '/demo' },
  },
  capability: {
    id: 'capability',
    eyebrow: 'Capability · Build',
    title: 'Know what the next step requires.',
    lede: 'Clarity shows what matters. Capability decides whether you can act on it well.',
    steps: [
      { title: 'Personal', line: 'See your skills and the gaps that matter now.' },
      { title: 'Organisational', line: 'Plan people, capacity and succession.' },
      { title: 'Even when unsure', line: '“Not sure yet” is a valid place to start.' },
    ],
    tourTitle: 'Capability tools in use',
    engines: [
      { name: 'Skills Gap Analysis', clip: 'A02' },
      { name: 'Workforce Plan', clip: 'A03' },
      { name: 'Succession & Bench Strength', clip: 'A22' },
    ],
    cta: { label: 'Try Capability', to: '/demo' },
  },
  consistency: {
    id: 'consistency',
    eyebrow: 'Consistency · Deliver',
    title: 'Turn good decisions into reliable progress.',
    lede: 'Consistency connects understanding and capability to steady action.',
    steps: [
      { title: 'Move the next action', line: 'Close the gap between deciding and doing.' },
      { title: 'Build a rhythm', line: 'Set a practical cadence around important work.' },
      { title: 'Review the result', line: 'Learn from what happened before moving on.' },
    ],
    tourTitle: 'Consistency tools in use',
    engines: [
      { name: 'Workload & Capacity Balance', clip: 'R05' },
      { name: 'Delivery Flow Metrics', clip: 'R02' },
      { name: 'Risk Register', clip: 'Q43' },
    ],
    cta: { label: 'Build your rhythm', to: '/demo' },
  },
  growth: {
    id: 'growth',
    eyebrow: 'Growth · The outcome',
    title: 'Growth is what the three add up to.',
    lede: 'It builds when clear decisions, stronger capability and steady delivery compound over time.',
    steps: [
      { title: 'Personal', line: 'Sharper judgement and more intentional progress.' },
      { title: 'Organisational', line: 'Better coordination, systems and team capability.' },
      { title: 'Without losing control', line: 'Scale while people stay in charge of decisions.' },
    ],
    tourTitle: 'Growth tools in use',
    engines: [
      { name: 'Growth Pathways', clip: 'G03' },
      { name: 'Growth Opportunity Scoring', clip: 'Z01' },
      { name: 'Growth Plan Feasibility', clip: 'G07' },
    ],
    cta: { label: 'Plan your growth', to: '/signup' },
  },
  rhythm: {
    id: 'rhythm',
    eyebrow: 'Rhythm',
    title: 'Make steady progress part of your rhythm.',
    lede: 'Daily action, weekly review and organisation-wide learning, kept in one place.',
    steps: [
      { title: 'Today', line: 'What matters now, and what does the next action need?' },
      { title: 'This week', line: 'What moved, what stalled and what keeps recurring?' },
      {
        title: 'Organisation',
        line: 'Where are priorities aligned and where is delivery slipping?',
      },
    ],
    tourTitle: 'Rhythm tools in use',
    engines: [
      { name: 'Operating Rhythm & Meeting Design', clip: 'S05' },
      { name: 'Drift & Stability Monitor', clip: 'R03' },
      { name: 'OKR & Strategy Review', clip: 'S06' },
    ],
    cta: { label: 'Explore the rhythm', to: '/demo' },
  },
};

function playVideo(event: { currentTarget: HTMLElement }) {
  const video = event.currentTarget.querySelector('video');
  if (video && video.paused) void video.play().catch(() => undefined);
}

export function HowItWorksPage({ content }: { content: HowItWorksContent }) {
  const [active, setActive] = useState(0);
  const engine = content.engines[active];
  const second = content.engines[(active + 1) % content.engines.length];
  const nav = content.group === 'product' ? productNav : cycle;
  const position = nav.findIndex((item) => item.id === content.id);
  const next = nav[position + 1];

  return (
    <div className="hx-page hiw-page">
      <nav className="hx-nav" aria-label={content.group === 'product' ? 'Product' : 'How it works'}>
        {nav.map((item) => (
          <Link
            key={item.id}
            to={item.to}
            aria-current={item.id === content.id ? 'page' : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <header className={content.id === 'workflows' ? 'hx-hero has-art' : 'hx-hero'}>
        {content.id === 'workflows' && <WorkflowArt />}
        <p className="hx-eyebrow">{content.eyebrow}</p>
        <h1>{content.title}</h1>
        <div className="hx-hero-foot">
          <p className="hx-lede">{content.lede}</p>
          <div className="hx-actions">
            <Link className="hx-btn hx-btn-solid" to={content.cta.to}>
              {content.cta.label}
            </Link>
            <Link className="hx-link" to="/contact">
              Get a demo
            </Link>
          </div>
        </div>
      </header>

      <section className="hx-path" aria-label={content.eyebrow}>
        <ol>
          {content.steps.map((step, index) => (
            <li key={step.title}>
              <span className="hx-node" aria-hidden="true" />
              <span className="hx-num">0{index + 1}</span>
              <h2>{step.title}</h2>
              <p>{step.line}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="hx-stage" aria-labelledby="hiw-tour-title">
        <div className="hx-stage-list">
          <h2 id="hiw-tour-title">{content.tourTitle}</h2>
          <ul role="group" aria-label="Tools">
            {content.engines.map((item, index) => (
              <li key={item.clip}>
                <button
                  type="button"
                  className={index === active ? 'is-active' : undefined}
                  aria-pressed={index === active}
                  onClick={() => setActive(index)}
                >
                  {item.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="hx-stage-view" data-pose={active % 3}>
          <div className="hx-frame" onMouseEnter={playVideo} onFocus={playVideo} tabIndex={0}>
            <video
              key={engine.clip}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label={`${engine.name} in use`}
            >
              <source src={`/videos/engines/${engine.clip}.webm`} type="video/webm" />
              <source src={`/videos/engines/${engine.clip}.mp4`} type="video/mp4" />
            </video>
          </div>
          {content.engines.length > 1 && (
            <div className="hx-frame hx-frame-second" aria-hidden="true">
              <video
                key={second.clip}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                tabIndex={-1}
              >
                <source src={`/videos/engines/${second.clip}.webm`} type="video/webm" />
                <source src={`/videos/engines/${second.clip}.mp4`} type="video/mp4" />
              </video>
              <span>{second.name}</span>
            </div>
          )}
        </div>
      </section>

      <MoreDetail />

      <footer className="hx-close">
        <h2>Start with the step in front of you.</h2>
        <div className="hx-actions">
          <Link className="hx-btn hx-btn-solid" to="/signup">
            Get started
          </Link>
          {next ? (
            <Link className="hx-link" to={next.to}>
              Next: {next.label} →
            </Link>
          ) : (
            <Link className="hx-link" to="/product">
              See the platform →
            </Link>
          )}
        </div>
      </footer>
    </div>
  );
}
