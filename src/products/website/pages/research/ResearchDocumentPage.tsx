import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  ResearchHeroSlide,
  ResearchAreasSlide1,
  MethodBeforeMessageSlide2,
  FromResearchToPracticeSlide3,
} from './slides';

/** /research — sections in reading order. */
export function ResearchDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<ResearchHeroSlide embedded={embedded} />}
    >
      <ResearchAreasSlide1 embedded={embedded} />
      <MethodBeforeMessageSlide2 embedded={embedded} />
      <FromResearchToPracticeSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
