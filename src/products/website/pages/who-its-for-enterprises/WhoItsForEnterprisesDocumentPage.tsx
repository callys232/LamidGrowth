import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  WhoItsForEnterprisesHeroSlide,
  SharedOrganizationalContextSlide1,
  OrganizationalCapabilitySlide2,
  GovernGrowthWithoutSlowingTheWorkSlide3,
  EnterpriseDepthWithoutEnterpriseClutterSlide4,
} from './slides';

/** /who-its-for/enterprises — sections in reading order. */
export function WhoItsForEnterprisesDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<WhoItsForEnterprisesHeroSlide embedded={embedded} />}
    >
      <SharedOrganizationalContextSlide1 embedded={embedded} />
      <OrganizationalCapabilitySlide2 embedded={embedded} />
      <GovernGrowthWithoutSlowingTheWorkSlide3 embedded={embedded} />
      <EnterpriseDepthWithoutEnterpriseClutterSlide4 embedded={embedded} />
    </DocumentPageLayout>
  );
}
