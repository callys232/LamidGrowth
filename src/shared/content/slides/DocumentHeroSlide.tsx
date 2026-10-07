import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';
import { OrbitVisual } from '../../visuals/Orbit';
import { CopyLine } from '../CopyLine';
import { TwoLineTitle } from '../TwoLineTitle';
import '../hero-title.css';
import type { DocumentPage, DocumentPageProps } from '../types';

const isAction = (text: string) => /^(CTA:|Links?:)/.test(text);

export function DocumentHeroSlide({
  page,
  embedded = false,
}: DocumentPageProps & { page: DocumentPage }) {
  const Title = embedded ? 'h2' : 'h1';
  const [open, setOpen] = useState(false);
  const panel = useId();
  const rest = page.hero.paragraphs.slice(1);
  // Long heroes keep the first line and the actions in view; the remaining body copy unfolds
  // on request so the hero stays scannable. Short heroes render exactly as before.
  const [lede, ...more] = rest.filter((p) => !isAction(p.text));
  const actions = rest.filter((p) => isAction(p.text));
  const collapsible = !embedded && more.reduce((n, p) => n + p.text.length, 0) > 120;
  return (
    <section className="content-hero section-wrap">
      <div>
        <div className="eyebrow">{page.name}</div>
        <Title data-source-paragraph={page.hero.paragraphs[0].sourceParagraph}>
          {!embedded && page.route.startsWith('/product') && !page.title.includes('\n') ? (
            <TwoLineTitle text={page.title} />
          ) : (
            page.title.split('\n').map((line, i, lines) => (
              <span key={i}>
                {line}
                {i < lines.length - 1 && <br />}
              </span>
            ))
          )}
        </Title>
        {collapsible ? (
          <>
            <CopyLine text={lede.text} paragraph={lede.sourceParagraph} />
            {actions.map((p) => (
              <CopyLine key={p.sourceParagraph} text={p.text} paragraph={p.sourceParagraph} />
            ))}
            <button
              type="button"
              className="content-hero-more-toggle"
              aria-expanded={open}
              aria-controls={panel}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? 'Show less' : 'Read more'}
              <ChevronDown size={16} aria-hidden="true" />
            </button>
            <div id={panel} className={`content-hero-more${open ? ' is-open' : ''}`} inert={!open}>
              <div>
                {more.map((p) => (
                  <CopyLine key={p.sourceParagraph} text={p.text} paragraph={p.sourceParagraph} />
                ))}
              </div>
            </div>
          </>
        ) : (
          rest.map((p) => (
            <CopyLine key={p.sourceParagraph} text={p.text} paragraph={p.sourceParagraph} />
          ))
        )}
      </div>
      {!embedded && <OrbitVisual small />}
    </section>
  );
}
