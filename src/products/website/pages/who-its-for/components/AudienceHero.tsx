import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase, Palette, User, type LucideIcon } from 'lucide-react';
import { CopyLine } from '../../../../../shared/content/CopyLine';
import content from '../content.json';

// Keyed by each section's real label, not its array position — a reordered or inserted section
// in content.json still resolves to the right icon/route instead of silently shifting. A label
// with no entry here falls back to a generic icon linking back to this page rather than crashing.
const CARD_META: Record<string, { to: string; Icon: LucideIcon }> = {
  Individual: { to: '/who-its-for/individuals', Icon: User },
  Professional: { to: '/who-its-for/professionals', Icon: Briefcase },
  Creator: { to: '/who-its-for/creators', Icon: Palette },
};
const DEFAULT_META = { to: '/who-its-for', Icon: User };

/** Hero + the audience entry cards in one dark band, mirroring the reference design's
 * hero-directly-into-service-cards composition. Every section but the last (the closing
 * proposition, rendered separately by AudienceClosing) becomes a card here — however many that
 * is. All text below is content.json's own copy. */
export function AudienceHero() {
  const [title, description, actions] = content.hero.paragraphs;
  const cards = content.sections.slice(0, -1);
  const featuredIndex = cards.length % 2 === 1 ? Math.floor(cards.length / 2) : -1;
  return (
    <section className="audience-hero">
      <div className="audience-container">
        <span className="audience-eyebrow">{content.hero.label}</span>
        <h1 data-source-paragraph={title.sourceParagraph}>{title.text}</h1>
        <p className="audience-hero-description" data-source-paragraph={description.sourceParagraph}>
          {description.text}
        </p>
        <CopyLine text={actions.text} paragraph={actions.sourceParagraph} />
        <ul className="audience-services">
          {cards.map((section, index) => {
            const [label, line] = section.paragraphs;
            const { to, Icon } = CARD_META[label.text] ?? DEFAULT_META;
            const featured = index === featuredIndex;
            return (
              <li
                key={section.label}
                className={`audience-service-card${featured ? ' is-featured' : ''}`}
              >
                <Link to={to}>
                  <Icon size={22} strokeWidth={1.6} aria-hidden="true" />
                  <h3 data-source-paragraph={label.sourceParagraph}>{label.text}</h3>
                  <p data-source-paragraph={line.sourceParagraph}>{line.text}</p>
                  <span className="audience-service-arrow" aria-hidden="true">
                    <ArrowRight size={15} strokeWidth={2} />
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
