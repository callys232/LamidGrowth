import { MechanicIcon } from '../components/MechanicIcon';
import { homeSection } from './homeSection';

/** How It Works: the five mechanics as framed cards (icon, title, body). The source titles are
 * numbered ("1.One Entry Point"); the number only picks the icon and is not shown. */
export function HomeHowItWorksSlide() {
  const [title, intro, ...rest] = homeSection('How It Works').paragraphs;
  const steps = rest.flatMap((paragraph, index) =>
    index % 2 === 0 ? [{ heading: paragraph, body: rest[index + 1] }] : [],
  );
  return (
    <section
      className="home-section home-mechanics-section"
      id={`section-${title.sourceParagraph}`}
      aria-labelledby="home-heading-mechanics"
      data-scroll-feedback="off"
    >
      <div className="home-container">
        <header className="home-mechanics-head">
          <h2 id="home-heading-mechanics" data-source-paragraph={title.sourceParagraph}>
            {title.text}
          </h2>
          <p data-source-paragraph={intro.sourceParagraph}>{intro.text}</p>
        </header>
        <ul className="home-mechanics-list">
          {steps.map(({ heading, body }) => {
            const [, number, name] = heading.text.match(/^(\d+)\.\s*(.*)$/) ?? [, '', heading.text];
            return (
              <li key={heading.sourceParagraph}>
                <MechanicIcon step={Number(number)} />
                <h3 data-source-paragraph={heading.sourceParagraph}>{name}</h3>
                <p data-source-paragraph={body.sourceParagraph}>{body.text}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
