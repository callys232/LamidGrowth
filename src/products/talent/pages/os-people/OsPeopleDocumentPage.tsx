import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  OsPeopleHeroSlide,
  CapabilityRequirementsSlide1,
  StrengthsSlide2,
  GapsSlide3,
  CareerAndRolePathwaysSlide4,
  ChooseHowToCloseTheGapSlide5,
} from './slides';

/** /os/people — sections in reading order. */
export function OsPeopleDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<OsPeopleHeroSlide embedded={embedded} />}
    >
      <CapabilityRequirementsSlide1 embedded={embedded} />
      <StrengthsSlide2 embedded={embedded} />
      <GapsSlide3 embedded={embedded} />
      <CareerAndRolePathwaysSlide4 embedded={embedded} />
      <ChooseHowToCloseTheGapSlide5 embedded={embedded} />
    </DocumentPageLayout>
  );
}
