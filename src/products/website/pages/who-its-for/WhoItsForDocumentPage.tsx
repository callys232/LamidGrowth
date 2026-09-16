import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import { DocumentHeroSlide } from '../../../../shared/content/slides/DocumentHeroSlide';
import { DocumentSectionSlide } from '../../../../shared/content/slides/DocumentSectionSlide';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { AudienceHero } from './components/AudienceHero';
import { AudienceContextGrid } from './components/AudienceContextGrid';
import { AudienceClosing } from './components/AudienceClosing';
import './who-its-for.css';

/** /who-its-for — bespoke layout; all styling scoped in who-its-for.css. Embedded rendering
 * (the collapsed "Full page copy" reference on other pages) falls back to the generic document
 * template, same as the homepage does. */
export function WhoItsForDocumentPage({ embedded = false }: DocumentPageProps) {
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
  return (
    <div className="audience-page" data-source-page={content.page}>
      <AudienceHero />
      <AudienceContextGrid />
      <AudienceClosing />
    </div>
  );
}
