import { CopyLine } from '../../../../../shared/content/CopyLine';
import content from '../content.json';

type Section = (typeof content.sections)[number];

export type ExpertGroup = { name: string; sections: Section[] };

/** Used as the band's anchor id so the site nav's 5 "Experts" entries (which all used to point at
 * the bare /experts URL — a repetitive no-op, since this page consolidates what were once 5
 * separate pages) can each jump to their real section instead. See PublicHeader.tsx. */
export function expertGroupSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Splits the page's flat section list into its real groups — every section that carries a
 * `group` field opens a new phase; the rest belong to whichever phase is currently open. Order
 * and membership come entirely from content.json. */
export function groupExpertSections(sections: Section[]): ExpertGroup[] {
  const groups: ExpertGroup[] = [];
  for (const section of sections) {
    if ('group' in section && section.group) {
      groups.push({ name: section.group, sections: [section] });
    } else {
      groups[groups.length - 1]!.sections.push(section);
    }
  }
  return groups;
}

function ExpertCard({ section }: { section: Section }) {
  const [title, ...rest] = section.paragraphs;
  return (
    <article className="expert-card">
      <h3 data-source-paragraph={title.sourceParagraph}>{title.text}</h3>
      {rest.map((p) => (
        <CopyLine key={p.sourceParagraph} text={p.text} paragraph={p.sourceParagraph} />
      ))}
    </article>
  );
}

/** One phase band: its first section acts as the phase's intro (title + lede, full width),
 * every remaining section in the group renders as a card in a grid below it. */
export function ExpertPhaseBand({
  index,
  group,
  tone,
}: {
  index: number;
  group: ExpertGroup;
  tone: 'plain' | 'tint' | 'dark';
}) {
  const [intro, ...rest] = group.sections;
  const [introTitle, ...introBody] = intro.paragraphs;
  return (
    <section id={expertGroupSlug(group.name)} className={`expert-phase expert-phase-${tone}`}>
      <div className="expert-container">
        <div className="expert-phase-intro">
          <span className="expert-phase-index" aria-hidden="true">
            {String(index + 1).padStart(2, '0')}
          </span>
          <div>
            <span className="expert-eyebrow">{group.name}</span>
            <h2 data-source-paragraph={introTitle.sourceParagraph}>{introTitle.text}</h2>
            {introBody.map((p) => (
              <CopyLine key={p.sourceParagraph} text={p.text} paragraph={p.sourceParagraph} />
            ))}
          </div>
        </div>
        {rest.length > 0 && (
          <ul className="expert-card-grid">
            {rest.map((section) => (
              <li key={section.label}>
                <ExpertCard section={section} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
