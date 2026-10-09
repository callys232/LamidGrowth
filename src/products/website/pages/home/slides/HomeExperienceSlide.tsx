import { useState } from 'react';
import { HomeCopy, HomeSection } from '../components/HomeSection';
import content from '../content.json';

// The four contexts in the source copy keep their capability lists (and source paragraph); the
// rest of the product's contexts (src/shared/lib/contexts.ts) are drawn from their own
// /who-its-for pages. "Personal" in the source copy is the product's "Individual" context.
const fromCopy = Object.fromEntries(
  content.sections[1].paragraphs.slice(2, 6).map((paragraph) => {
    const [name, items] = paragraph.text.replace(/^•\s*/, '').split(' - ');
    return [
      name === 'Personal' ? 'Individual' : name,
      { items: items.replace(/\.$/, '').split(', '), source: paragraph.sourceParagraph },
    ];
  }),
) as Record<string, { items: string[]; source: number }>;

type Scenario = { objective: string; context: string; recommendation: string; action: string };

const CONTEXTS: { name: string; items?: string[]; scenario: Scenario }[] = [
  {
    name: 'Individual',
    scenario: {
      objective: 'Is this role the right next move?',
      context: 'Your priorities, current strengths, and the role requirements.',
      recommendation: 'Compare the opportunity with the skills you want to develop.',
      action: 'Build a focused development plan before deciding.',
    },
  },
  {
    name: 'Professional',
    items: ['Decisions', 'Capability', 'Career Path', 'Opportunities', 'Rhythm', 'Progress'],
    scenario: {
      objective: 'Am I building the right skills for my next role?',
      context: 'Your target role, current capability, and the gaps between them.',
      recommendation: 'Weigh training, projects, and certifications against what the role needs.',
      action: 'Commit to one development step this month.',
    },
  },
  {
    name: 'Creator',
    items: ['Direction', 'Opportunity', 'Audience', 'Pricing', 'Planning', 'Execution'],
    scenario: {
      objective: 'Which offer should I launch next?',
      context: 'Your audience, channels, current offers, and the time you have.',
      recommendation: 'Compare demand, pricing, and effort for each offer against your direction.',
      action: 'Plan a small launch to test it before going all in.',
    },
  },
  {
    name: 'Founder',
    scenario: {
      objective: 'Can we afford the next hire?',
      context: 'Your financial assumptions, delivery demand, and team capacity.',
      recommendation: 'Compare hiring now with a phased or contract option.',
      action: 'Review a hiring scenario before committing budget.',
    },
  },
  {
    name: 'Team',
    scenario: {
      objective: 'What should we prioritize this week?',
      context: 'Shared deadlines, dependencies, and available people.',
      recommendation: 'Surface the blocked handoff and agree on what moves first.',
      action: 'Review owners and next steps together.',
    },
  },
  {
    name: 'SME',
    items: ['Operations', 'Finance', 'People', 'Opportunities', 'Workflows', 'Execution'],
    scenario: {
      objective: 'Where are we losing margin?',
      context: 'Cost drivers, pricing, cash flow, and workflow bottlenecks.',
      recommendation: 'Compare a price change with fixing the costliest bottleneck.',
      action: 'Run a margin scenario before changing anything.',
    },
  },
  {
    name: 'Enterprise',
    scenario: {
      objective: 'Are teams aligned for the next launch?',
      context: 'Cross-team priorities, responsibilities, and governance requirements.',
      recommendation: 'Identify conflicting dependencies and decisions needing review.',
      action: 'Bring an alignment plan to the accountable owners.',
    },
  },
  {
    name: 'Institution',
    items: [
      'Institutional Clarity',
      'Workforce Capability',
      'Governance',
      'Continuity',
      'Human Oversight',
      'Impact',
    ],
    scenario: {
      objective: 'Is the programme on track for the people it serves?',
      context: 'Long-term objectives, dependencies, workforce capability, and oversight duties.',
      recommendation: 'Find where capacity or accountability gaps put delivery at risk.',
      action: 'Bring a reviewed plan to the accountable board or committee.',
    },
  },
];

const contexts = CONTEXTS.map((c) => ({
  ...c,
  items: c.items ?? fromCopy[c.name].items,
  source: c.items ? undefined : fromCopy[c.name].source,
}));

export function HomeExperienceSlide() {
  const [selected, setSelected] = useState(0);
  const context = contexts[selected];
  const scenario = context.scenario;
  return (
    <HomeSection section={1} className="home-experience-section">
      <div className="home-context-selector" role="group" aria-label="Choose an audience context">
        {contexts.map((item, index) => (
          <button
            type="button"
            key={item.name}
            aria-pressed={selected === index}
            aria-controls="home-context-example"
            onClick={() => setSelected(index)}
          >
            {item.name}
          </button>
        ))}
      </div>
      <div
        className="home-context-example"
        data-context={context.name}
        id="home-context-example"
        aria-live="polite"
        aria-atomic="true"
      >
        <div>
          <span className="home-eyebrow" data-source-paragraph={context.source}>
            {context.name.toUpperCase()} · ILLUSTRATIVE EXAMPLE
          </span>
          <h3>{scenario.objective}</h3>
          <p className="home-context-capabilities" data-source-paragraph={context.source}>
            {context.items.join(' · ')}
          </p>
        </div>
        <dl className="home-scenario-steps">
          <div>
            <dt>Bring into view</dt>
            <dd>{scenario.context}</dd>
          </div>
          <div>
            <dt>Compare the options</dt>
            <dd>{scenario.recommendation}</dd>
          </div>
          <div>
            <dt>Your next step</dt>
            <dd>{scenario.action}</dd>
          </div>
        </dl>
      </div>
      <div className="home-section-end">
        <HomeCopy section={1} from={6} />
      </div>
    </HomeSection>
  );
}
