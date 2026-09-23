import { HomeSection } from '../components/HomeSection';
import content from '../content.json';
export function HomeRhythmSlide() {
  return (
    <HomeSection section={4} className="home-rhythm-section">
      <div className="home-rhythm-reviews">
        {content.sections[4].paragraphs.slice(2, 6).map((paragraph) => {
          const [title, body] = paragraph.text.replace(/^•\s*/, '').split(' - ');
          const split = body.indexOf('. ');
          return (
            <details
              className="home-disclosure"
              key={paragraph.sourceParagraph}
              data-source-paragraph={paragraph.sourceParagraph}
            >
              <summary>
                <span>
                  <strong>{title}</strong>
                  <span>{body.slice(0, split + 1)}</span>
                </span>
              </summary>
              <p>{body.slice(split + 2)}</p>
            </details>
          );
        })}
      </div>
    </HomeSection>
  );
}
