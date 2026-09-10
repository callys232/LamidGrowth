import type { ReactNode } from 'react';
import { CopyLine } from '../../../../../shared/content/CopyLine';
import content from '../content.json';

export function HomeCopy({
  section,
  from = 1,
  to,
}: {
  section: number;
  from?: number;
  to?: number;
}) {
  return (
    <>
      {content.sections[section].paragraphs.slice(from, to).map((p) => (
        <CopyLine key={p.sourceParagraph} text={p.text} paragraph={p.sourceParagraph} />
      ))}
    </>
  );
}

export function HomeSection({
  section,
  label,
  introduction,
  className = '',
  children,
}: {
  section: number;
  label?: string;
  introduction?: string;
  className?: string;
  children: ReactNode;
}) {
  const copy = content.sections[section];
  return (
    <section
      className={`home-section ${className}`}
      id={`section-${copy.paragraphs[0].sourceParagraph}`}
      aria-labelledby={`home-heading-${section}`}
    >
      <div className="home-container">
        <header className="home-section-heading">
          {label && <span className="home-eyebrow">{label}</span>}
          <h2
            id={`home-heading-${section}`}
            data-source-paragraph={copy.paragraphs[0].sourceParagraph}
          >
            {copy.title}
          </h2>
          {introduction ? <p>{introduction}</p> : <HomeCopy section={section} to={2} />}
        </header>
        {children}
      </div>
    </section>
  );
}

/** Preserves source text while giving the label and description distinct visual weight. */
export function HomeFeatureList({
  section,
  from = 2,
  to,
  className = '',
}: {
  section: number;
  from?: number;
  to: number;
  className?: string;
}) {
  return (
    <ul className={`home-feature-list ${className}`}>
      {content.sections[section].paragraphs.slice(from, to).map((p, index) => {
        const divider = p.text.indexOf(' - ');
        return (
          <li key={p.sourceParagraph}>
            <span className="home-feature-number" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            <p data-source-paragraph={p.sourceParagraph}>
              {divider < 0 ? (
                p.text
              ) : (
                <>
                  <strong>{p.text.slice(0, divider)}</strong>
                  <span className="home-copy-divider">{' - '}</span>
                  <span>{p.text.slice(divider + 3)}</span>
                </>
              )}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
