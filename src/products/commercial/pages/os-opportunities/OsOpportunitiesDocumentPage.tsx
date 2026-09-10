import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  OsOpportunitiesHeroSlide,
  OpportunitySlide1,
  RequiredCapabilitySlide2,
  ChooseBetweenTwoGrowthPathsSlide3,
} from './slides';

/** /os/opportunities — sections in reading order. */
export function OsOpportunitiesDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<OsOpportunitiesHeroSlide embedded={embedded} />}
    >
      <OpportunitySlide1 embedded={embedded} />
      <RequiredCapabilitySlide2 embedded={embedded} />
      <ChooseBetweenTwoGrowthPathsSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
