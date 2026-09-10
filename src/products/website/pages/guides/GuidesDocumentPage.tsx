import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  GuidesHeroSlide,
  GuideFormatsSlide1,
  RunABetterWeeklyReviewSlide2,
  PutTheGuideToWorkSlide3,
} from './slides';

/** /guides — sections in reading order. */
export function GuidesDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<GuidesHeroSlide embedded={embedded} />}
    >
      <GuideFormatsSlide1 embedded={embedded} />
      <RunABetterWeeklyReviewSlide2 embedded={embedded} />
      <PutTheGuideToWorkSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
