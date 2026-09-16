import type { LucideIcon } from 'lucide-react';
import { DocumentPageLayout } from '../DocumentPageLayout';
import { DocumentHeroSlide } from '../slides/DocumentHeroSlide';
import { DocumentSectionSlide } from '../slides/DocumentSectionSlide';
import { CopyLine } from '../CopyLine';
import type { DocumentPage, DocumentPageProps } from '../types';
import './engine.css';

/** Shared bespoke layout for the 5 "engine" product pages (/product/companion, /product/
 * experience, /product/intelligence, /product/workflows, /product/organizations) — they all
 * share one shape (hero, 3 tool sections, 1 closing section), so this is one reusable template
 * driven entirely by each page's own content.json, not 5 separate bespoke page trees. `icons` is
 * presentation only (no content); every section but the last becomes a tool card, whatever that
 * count is. Embedded rendering (the collapsed "Full page copy" reference) falls back to the
 * generic document template, same as every other bespoke page this session. */
export function EngineDocumentPage({
  content,
  icons,
  embedded = false,
}: DocumentPageProps & { content: DocumentPage; icons: LucideIcon[] }) {
  if (embedded)
    return (
      <DocumentPageLayout
        page={content}
        embedded
        hero={<DocumentHeroSlide page={content} embedded />}
      >
        {content.sections.map((section, index) => (
          <DocumentSectionSlide
            key={section.label}
            section={section}
            index={index}
            last={index === content.sections.length - 1}
            embedded
          />
        ))}
      </DocumentPageLayout>
    );
  const [title, description, actions] = content.hero.paragraphs;
  const tools = content.sections.slice(0, -1);
  const closing = content.sections.at(-1)!;
  const [closingTitle, ...closingRest] = closing.paragraphs;
  return (
    <div className="engine-page" data-source-page={content.page}>
      <section className="engine-hero">
        <div className="engine-container">
          <span className="engine-eyebrow">{content.hero.label}</span>
          <h1 data-source-paragraph={title.sourceParagraph}>{title.text}</h1>
          <p className="engine-hero-description" data-source-paragraph={description.sourceParagraph}>
            {description.text}
          </p>
          <CopyLine text={actions.text} paragraph={actions.sourceParagraph} />
        </div>
      </section>
      <section className="engine-tools">
        <div className="engine-container">
          <ul className="engine-tools-grid">
            {tools.map((section, index) => {
              const [toolTitle, ...rest] = section.paragraphs;
              const Icon = icons[index];
              return (
                <li key={section.label} className="engine-tool-card">
                  {Icon && <Icon size={24} strokeWidth={1.6} aria-hidden="true" />}
                  <h3 data-source-paragraph={toolTitle.sourceParagraph}>{toolTitle.text}</h3>
                  {rest.map((p) => (
                    <CopyLine key={p.sourceParagraph} text={p.text} paragraph={p.sourceParagraph} />
                  ))}
                </li>
              );
            })}
          </ul>
        </div>
      </section>
      <section className="engine-closing">
        <div className="engine-container">
          <h2 data-source-paragraph={closingTitle.sourceParagraph}>{closingTitle.text}</h2>
          {closingRest.map((p) => (
            <CopyLine key={p.sourceParagraph} text={p.text} paragraph={p.sourceParagraph} />
          ))}
        </div>
      </section>
    </div>
  );
}
