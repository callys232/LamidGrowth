import { HomeCopy } from '../components/HomeSection';
import content from '../content.json';
import { useRef } from 'react';
import { useInView } from 'motion/react';

export function HomeExpansionSlide() {
  const copy = content.sections[5];
  const path = useRef<HTMLOListElement>(null);
  const visible = useInView(path, { once: true, amount: 0.3 });
  return (
    <section
      className="home-section home-expansion-section"
      id={`section-${copy.paragraphs[0].sourceParagraph}`}
      aria-labelledby="home-heading-5"
    >
      <div className="home-container">
        <header className="home-section-heading">
          <h2 id="home-heading-5" data-source-paragraph={copy.paragraphs[0].sourceParagraph}>
            {copy.title}
          </h2>
        </header>
        <ol
          ref={path}
          className={`home-expansion-path${visible ? ' is-visible' : ''}`}
          data-source-paragraph={copy.paragraphs[1].sourceParagraph}
          aria-label="Expand with your context"
        >
          {copy.paragraphs[1].text.split(' -> ').map((stage, index) => (
            <li key={stage}>
              <span>0{index + 1}</span>
              <strong>{stage}</strong>
            </li>
          ))}
        </ol>
        <details className="home-disclosure home-expansion-copy">
          <summary>How your workspace grows with you</summary>
          <HomeCopy section={5} from={2} />
        </details>
      </div>
    </section>
  );
}
