import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  WhoItsForSmesHeroSlide,
  OperationsSlide1,
  FinancialUnderstandingSlide2,
  ImproveMarginWithoutSlowingGrowthSlide3,
  MoreCapabilityLessFragmentationSlide4,
} from './slides';

/** /who-its-for/smes — sections in reading order. */
export function WhoItsForSmesDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<WhoItsForSmesHeroSlide embedded={embedded} />}
    >
      <OperationsSlide1 embedded={embedded} />
      <FinancialUnderstandingSlide2 embedded={embedded} />
      <ImproveMarginWithoutSlowingGrowthSlide3 embedded={embedded} />
      <MoreCapabilityLessFragmentationSlide4 embedded={embedded} />
    </DocumentPageLayout>
  );
}
