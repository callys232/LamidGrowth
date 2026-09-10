import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  ResourcesHeroSlide,
  InsightsSlide1,
  GuidesSlide2,
  ImproveDecisionQualitySlide3,
} from './slides';

/** /resources — sections in reading order. */
export function ResourcesDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<ResourcesHeroSlide embedded={embedded} />}
    >
      <InsightsSlide1 embedded={embedded} />
      <GuidesSlide2 embedded={embedded} />
      <ImproveDecisionQualitySlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
