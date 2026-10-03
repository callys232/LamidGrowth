import { homeSection } from './HomeLongFormSlides';

/** How It Works: the five mechanics, each a numbered title paragraph followed by its body. */
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
    >
      <div className="home-container">
        <header className="home-section-heading">
          <h2 id="home-heading-mechanics" data-source-paragraph={title.sourceParagraph}>
            {title.text}
          </h2>
          <p data-source-paragraph={intro.sourceParagraph}>{intro.text}</p>
        </header>
        <ol className="home-mechanics-list">
          {steps.map(({ heading, body }) => {
            const [, number, name] = heading.text.match(/^(\d+)\.\s*(.*)$/) ?? [, '', heading.text];
            return (
              <li key={heading.sourceParagraph}>
                <span className="home-mechanics-number" aria-hidden="true">
                  {number.padStart(2, '0')}
                </span>
                <h3 data-source-paragraph={heading.sourceParagraph}>
                  <span className="sr-only">{number}. </span>
                  {name}
                </h3>
                <p data-source-paragraph={body.sourceParagraph}>{body.text}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
