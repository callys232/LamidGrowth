import { ArrowRight, Compass, Gauge, Layers3, LifeBuoy, Repeat, Sprout } from 'lucide-react';
import { Link } from 'react-router-dom';
import { homeSection } from './homeSection';

/** Each pillar opens the page that covers it in depth (existing public pages, in pillar order). */
const PILLARS = [
  { Icon: Compass, to: '/how-it-works/clarity' },
  { Icon: Layers3, to: '/how-it-works/capability' },
  // Execution — "Turn Good Decisions Into Reliable Progress": moving the next action.
  { Icon: Gauge, to: '/how-it-works/consistency' },
  // Consistency — "Make Progress a Rhythm, Not an Event": dependable, repeated performance.
  { Icon: Repeat, to: '/how-it-works/rhythm' },
  // Sustainability — "Growth Is the Outcome": growth that lasts.
  { Icon: Sprout, to: '/how-it-works/growth' },
  { Icon: LifeBuoy, to: '/experts' },
];

/** Value Pillars: six linked cards, each split into name and description at the em dash. */
export function HomePillarsSlide() {
  const [title, intro, ...pillars] = homeSection('Value Pillars').paragraphs;
  return (
    <section
      className="home-section home-objective-section"
      id={`section-${title.sourceParagraph}`}
      aria-labelledby="home-heading-pillars"
      data-scroll-feedback="off"
    >
      <div className="home-container">
        <header className="home-objective-heading">
          <h2 id="home-heading-pillars" data-source-paragraph={title.sourceParagraph}>
            Value <em>Pillars</em>
          </h2>
          <p data-source-paragraph={intro.sourceParagraph}>{intro.text}</p>
        </header>
        <ul className="home-pillar-grid">
          {pillars.map((paragraph, index) => {
            const [name, description] = paragraph.text.replace(/^-\s*/, '').split(' — ');
            const { Icon, to } = PILLARS[index];
            return (
              <li key={paragraph.sourceParagraph}>
                <Link
                  className="home-pillar-card"
                  to={to}
                  data-source-paragraph={paragraph.sourceParagraph}
                >
                  <span className="home-pillar-icon" aria-hidden="true">
                    <Icon size={24} strokeWidth={1.6} />
                  </span>
                  <h3>{name}</h3>
                  <p>{description}</p>
                  <span className="home-pillar-cue" aria-hidden="true">
                    Explore <ArrowRight size={15} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
