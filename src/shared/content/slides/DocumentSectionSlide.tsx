import { CopyLine } from '../CopyLine';
import type { CopySection, DocumentPageProps } from '../types';

export function DocumentSectionSlide({
  section,
  index,
  last = false,
  embedded = false,
}: DocumentPageProps & { section: CopySection; index: number; last?: boolean }) {
  const dense =
    section.paragraphs.length > 5 ||
    section.paragraphs.reduce((n, p) => n + p.text.length, 0) > 900;
  const closing = last && section.paragraphs.some((p) => p.text.startsWith('CTA:'));
  const layout = closing ? 'showcase-closing' : dense ? 'showcase-feature' : 'showcase-card';
  return (
    <article
      className={`editorial-section ${!embedded ? layout : index === 2 ? 'dark-section' : ''} ${!embedded && closing ? 'dark-section' : ''}`}
      id={`section-${section.paragraphs[0].sourceParagraph}`}
      data-section-anchor={!embedded ? '' : undefined}
    >
      <div className="section-heading">
        <span className="editorial-number">{String(index + 1).padStart(2, '0')}</span>
        <h2 data-source-paragraph={section.paragraphs[0].sourceParagraph}>{section.title}</h2>
      </div>
      <div className="section-body">
        {section.paragraphs.slice(1).map((p) => (
          <CopyLine key={p.sourceParagraph} text={p.text} paragraph={p.sourceParagraph} />
        ))}
      </div>
    </article>
  );
}
