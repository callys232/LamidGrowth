import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import { DocumentSectionSlide } from '../../../../shared/content/slides/DocumentSectionSlide';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { ExpertNetworkHeroSlide } from './slides';

/** /experts — the consolidated Expert Network page: discovery, matching, verification,
 * capability strategy and joining as an expert, all in one page rather than five near-empty ones. */
export function ExpertsDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<ExpertNetworkHeroSlide embedded={embedded} />}
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
    </DocumentPageLayout>
  );
}
