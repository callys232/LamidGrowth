import { CopyLine } from '../../../../../shared/content/CopyLine';
import content from '../content.json';

/** Closing dark band bookending the hero — reuses the page's own last section (whatever it is)
 * verbatim. Deriving "last" rather than a fixed index means an inserted section elsewhere in
 * content.json doesn't silently break which one renders as the closing band. */
export function AudienceClosing() {
  const section = content.sections.at(-1)!;
  const [title, ...rest] = section.paragraphs;
  return (
    <section className="audience-closing">
      <div className="audience-container">
        <h2 data-source-paragraph={title.sourceParagraph}>{title.text}</h2>
        {rest.map((p) => (
          <CopyLine key={p.sourceParagraph} text={p.text} paragraph={p.sourceParagraph} />
        ))}
      </div>
    </section>
  );
}
