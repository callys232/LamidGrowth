import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { HomeCopy, HomeSection } from '../components/HomeSection';
import { OutcomeDiagram } from '../components/OutcomeDiagram';
import content from '../content.json';

const outcomes = content.sections[2].paragraphs.slice(2, 6).map((paragraph) => {
  const [title, body] = paragraph.text.replace(/^•\s*/, '').split(' - ');
  const divider = body.lastIndexOf('. ');
  return {
    title,
    description: body.slice(0, divider + 1),
    perspectives: body.slice(divider + 2),
    source: paragraph.sourceParagraph,
  };
});

export function HomeOutcomesSlide() {
  const [selected, setSelected] = useState(0);
  return (
    <HomeSection
      section={2}
      className="home-outcomes-section"
    >
      <div className="home-outcome-showcase">
        <div className="home-outcome-choices" role="group" aria-label="Choose an outcome">
          {outcomes.map((outcome, index) => (
            <button
              key={outcome.source}
              type="button"
              aria-pressed={selected === index}
              aria-controls="home-outcome-display"
              onClick={() => setSelected(index)}
            >
              <span className="home-outcome-choice-number">0{index + 1}</span>
              <span>{outcome.title}</span>
              <ArrowUpRight size={18} aria-hidden="true" />
            </button>
          ))}
          <div className="home-outcome-summary">
            <HomeCopy section={2} from={6} />
          </div>
        </div>
        <div
          id="home-outcome-display"
          className="home-outcome-display"
          aria-live="polite"
          aria-atomic="true"
        >
          {outcomes.map((outcome, index) => (
            <article
              key={outcome.source}
              className={`home-outcome-pane outcome-tone-${index}`}
              style={{ visibility: selected === index ? 'visible' : 'hidden' }}
              aria-hidden={selected !== index}
              data-source-paragraph={outcome.source}
            >
              <div className="home-outcome-art">
                <OutcomeDiagram index={index} />
              </div>
              <div className="home-outcome-body">
                <h3>{outcome.title}</h3>
                <p>{outcome.description}</p>
                <p className="home-outcome-perspectives">{outcome.perspectives}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </HomeSection>
  );
}
