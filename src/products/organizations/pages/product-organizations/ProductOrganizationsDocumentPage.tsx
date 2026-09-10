import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  ProductOrganizationsHeroSlide,
  SharedContextSlide1,
  OrganizationalRhythmSlide2,
  GovernanceSlide3,
  ScaleTheCapabilityPreserveTheCoherenceSlide4,
} from './slides';

/** /product/organizations — sections in reading order. */
export function ProductOrganizationsDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<ProductOrganizationsHeroSlide embedded={embedded} />}
    >
      <SharedContextSlide1 embedded={embedded} />
      <OrganizationalRhythmSlide2 embedded={embedded} />
      <GovernanceSlide3 embedded={embedded} />
      <ScaleTheCapabilityPreserveTheCoherenceSlide4 embedded={embedded} />
    </DocumentPageLayout>
  );
}
