import { Building2, CalendarDays, CalendarRange, Sun } from 'lucide-react';
import { HomeSection } from '../components/HomeSection';
import content from '../content.json';

const CADENCE_ICONS = [Sun, CalendarDays, CalendarRange, Building2];

/** Turn Progress Into a Rhythm: the four cadences (Today → This Week → This Month → Across Your
 * Organization) as a colour-coded timeline. Each shows its name, its lead sentence and the rest
 * of its copy, all visible — split from the source line at " - " and the first sentence end. */
export function HomeRhythmSlide() {
  return (
    <HomeSection section={4} className="home-rhythm-section">
      <ol className="home-rhythm-steps" data-scroll-feedback="off">
        {content.sections[4].paragraphs.slice(2, 6).map((paragraph, index) => {
          const [title, body] = paragraph.text.replace(/^•\s*/, '').split(' - ');
          const split = body.indexOf('. ');
          const Icon = CADENCE_ICONS[index];
          return (
            <li key={paragraph.sourceParagraph} data-source-paragraph={paragraph.sourceParagraph}>
              <span className="home-rhythm-node" aria-hidden="true">
                <Icon size={20} strokeWidth={1.7} />
              </span>
              <div className="home-rhythm-card">
                <h3>{title}</h3>
                <p className="home-rhythm-lead">{body.slice(0, split + 1)}</p>
                <p>{body.slice(split + 2)}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </HomeSection>
  );
}
