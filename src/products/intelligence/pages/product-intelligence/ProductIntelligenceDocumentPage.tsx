import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  ProductIntelligenceHeroSlide,
  ChooseYourNextProfessionalMoveSlide1,
  PlanTheNextStageOfTheBusinessSlide2,
  StrengthenOrganizationalAlignmentSlide3,
  OneObjectiveTheRelevantDepthSlide4,
} from './slides';

/** /product/intelligence — sections in reading order. */
export function ProductIntelligenceDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<ProductIntelligenceHeroSlide embedded={embedded} />}
    >
      <ChooseYourNextProfessionalMoveSlide1 embedded={embedded} />
      <PlanTheNextStageOfTheBusinessSlide2 embedded={embedded} />
      <StrengthenOrganizationalAlignmentSlide3 embedded={embedded} />
      <OneObjectiveTheRelevantDepthSlide4 embedded={embedded} />
    </DocumentPageLayout>
  );
}
