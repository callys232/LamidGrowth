import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  WhoItsForInstitutionsHeroSlide,
  InstitutionalClaritySlide1,
  WorkforceCapabilitySlide2,
  GovernanceSlide3,
  TechnologyShouldStrengthenTheInstitutionNotBlurItsResponsibilitySlide4,
} from './slides';

/** /who-its-for/institutions — sections in reading order. */
export function WhoItsForInstitutionsDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<WhoItsForInstitutionsHeroSlide embedded={embedded} />}
    >
      <InstitutionalClaritySlide1 embedded={embedded} />
      <WorkforceCapabilitySlide2 embedded={embedded} />
      <GovernanceSlide3 embedded={embedded} />
      <TechnologyShouldStrengthenTheInstitutionNotBlurItsResponsibilitySlide4 embedded={embedded} />
    </DocumentPageLayout>
  );
}
