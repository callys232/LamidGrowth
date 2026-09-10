import { OrbitVisual } from '../../visuals/Orbit';
import { CopyLine } from '../CopyLine';
import type { DocumentPage, DocumentPageProps } from '../types';

export function DocumentHeroSlide({
  page,
  embedded = false,
}: DocumentPageProps & { page: DocumentPage }) {
  const Title = embedded ? 'h2' : 'h1';
  return (
    <section className="content-hero section-wrap">
      <div>
        <div className="eyebrow">{page.name}</div>
        <Title data-source-paragraph={page.hero.paragraphs[0].sourceParagraph}>{page.title}</Title>
        {page.hero.paragraphs.slice(1).map((p) => (
          <CopyLine key={p.sourceParagraph} text={p.text} paragraph={p.sourceParagraph} />
        ))}
      </div>
      {!embedded && <OrbitVisual small />}
    </section>
  );
}
