import type { ReactNode } from 'react';
import { DocumentPageLayout } from './DocumentPageLayout';
import { DocumentHeroSlide } from './slides/DocumentHeroSlide';
import { DocumentSectionSlide } from './slides/DocumentSectionSlide';
import type { DocumentPage, DocumentPageProps } from './types';

/** Render every line of a document update, without relying on old section counts. */
export function UpdatedDocumentPage({
  content,
  embedded = false,
  extraSection,
  hero,
}: DocumentPageProps & { content: DocumentPage; extraSection?: ReactNode; hero?: ReactNode }) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={hero ?? <DocumentHeroSlide page={content} embedded={embedded} />}
    >
      {content.sections.map((section, index) => (
        <DocumentSectionSlide
          key={section.label}
          section={section}
          index={index}
          last={index === content.sections.length - 1}
          embedded={embedded}
        />
      ))}
      {!embedded && extraSection}
    </DocumentPageLayout>
  );
}
