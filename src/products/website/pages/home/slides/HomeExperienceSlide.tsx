import { useState } from 'react';
import { HomeCopy, HomeSection } from '../components/HomeSection';
import content from '../content.json';

const contexts = content.sections[1].paragraphs.slice(2, 6).map((paragraph) => {
  const [name, items] = paragraph.text.replace(/^•\s*/, '').split(' - ');
  return { name, items: items.replace(/\.$/, '').split(', '), source: paragraph.sourceParagraph };
});

const scenarios = [
  {
    objective: 'Is this role the right next move?',
    context: 'Your priorities, current strengths, and the role requirements.',
    recommendation: 'Compare the opportunity with the skills you want to develop.',
    action: 'Build a focused development plan before deciding.',
  },
  {
    objective: 'Can we afford the next hire?',
    context: 'Your financial assumptions, delivery demand, and team capacity.',
    recommendation: 'Compare hiring now with a phased or contract option.',
    action: 'Review a hiring scenario before committing budget.',
  },
  {
    objective: 'What should we prioritize this week?',
    context: 'Shared deadlines, dependencies, and available people.',
    recommendation: 'Surface the blocked handoff and agree on what moves first.',
    action: 'Review owners and next steps together.',
  },
  {
    objective: 'Are teams aligned for the next launch?',
    context: 'Cross-team priorities, responsibilities, and governance requirements.',
    recommendation: 'Identify conflicting dependencies and decisions needing review.',
    action: 'Bring an alignment plan to the accountable owners.',
  },
];

export function HomeExperienceSlide() {
  const [selected, setSelected] = useState(0);
  const context = contexts[selected];
  const scenario = scenarios[selected];
  return (
    <HomeSection
      section={1}
      className="home-experience-section"
    >
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
