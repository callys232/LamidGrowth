import { Compass, Gauge, Layers3, LifeBuoy, Repeat, Sprout } from 'lucide-react';
import { homeSection } from './HomeLongFormSlides';

const icons = [Compass, Layers3, Gauge, Repeat, Sprout, LifeBuoy];

/** Value Pillars: the six pillars as cards, split into name and description at the em dash. */
export function HomePillarsSlide() {
  const [title, intro, ...pillars] = homeSection('Value Pillars').paragraphs;
  return (
    <section
      className="home-section home-objective-section"
      id={`section-${title.sourceParagraph}`}
      aria-labelledby="home-heading-pillars"
    >
      <div className="home-container">
        <header className="home-objective-heading">
          <h2 id="home-heading-pillars" data-source-paragraph={title.sourceParagraph}>
            Value <em>Pillars</em>
          </h2>
          <p data-source-paragraph={intro.sourceParagraph}>{intro.text}</p>
        </header>
        <div className="home-objective-grid">
          {pillars.map((paragraph, index) => {
            const [name, description] = paragraph.text.replace(/^-\s*/, '').split(' — ');
            const Icon = icons[index];
            return (
              <article
                className="home-objective-card"
                key={paragraph.sourceParagraph}
                data-source-paragraph={paragraph.sourceParagraph}
              >
                <div className="home-objective-card-top">
                  <Icon size={22} strokeWidth={1.4} aria-hidden="true" />
                  <span>0{index + 1}</span>
                </div>
                <h3>{name}</h3>
                <p>{description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
