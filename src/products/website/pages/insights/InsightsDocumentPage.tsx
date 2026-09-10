import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  InsightsHeroSlide,
  TopicsSlide1,
  UsefulByDesignSlide2,
  OutcomeCollectionsSlide3,
} from './slides';

/** /insights — sections in reading order. */
export function InsightsDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<InsightsHeroSlide embedded={embedded} />}
    >
      <TopicsSlide1 embedded={embedded} />
      <UsefulByDesignSlide2 embedded={embedded} />
      <OutcomeCollectionsSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
