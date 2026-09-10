import { ArrowUpRight, Compass, Layers3, ShieldCheck } from 'lucide-react';
import { HomeCopy } from '../components/HomeSection';
import content from '../content.json';

const icons = [Compass, Layers3, ArrowUpRight];

export function HomeCompanionSlide() {
  const copy = content.sections[0];
  return (
    <section
      className="home-section home-objective-section"
      id={`section-${copy.paragraphs[0].sourceParagraph}`}
      aria-labelledby="home-heading-0"
    >
      <div className="home-container">
        <header className="home-objective-heading">
          <div>
            <span
              className="home-eyebrow"
              data-source-paragraph={copy.paragraphs[1].sourceParagraph}
            >
              {copy.paragraphs[1].text}
            </span>
            <h2 id="home-heading-0" data-source-paragraph={copy.paragraphs[0].sourceParagraph}>
              Start With What You're <em>Trying to Achieve</em>
            </h2>
          </div>
          <HomeCopy section={0} from={2} to={3} />
        </header>
        <div className="home-objective-grid">
          {copy.paragraphs.slice(3, 6).map((paragraph, index) => {
            const [title, description] = paragraph.text.replace(/^•\s*/, '').split(' - ');
            const Icon = icons[index];
            return (
              <article
                className="home-objective-card"
                key={paragraph.sourceParagraph}
                data-source-paragraph={paragraph.sourceParagraph}
              >
                <div className="home-objective-card-top">
                  <Icon size={22} strokeWidth={1.4} />
                  <span>0{index + 1}</span>
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            );
          })}
        </div>
        <footer className="home-objective-footer">
          <div>
            <ShieldCheck size={20} />
            <p data-source-paragraph={copy.paragraphs[6].sourceParagraph}>
              {copy.paragraphs[6].text.replace(/^•\s*/, '')}
            </p>
          </div>
          <HomeCopy section={0} from={7} />
        </footer>
      </div>
    </section>
  );
}
