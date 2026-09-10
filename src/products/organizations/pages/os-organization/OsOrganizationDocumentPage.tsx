import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  OsOrganizationHeroSlide,
  CapabilitySlide1,
  RhythmSlide2,
  GovernanceSlide3,
} from './slides';

/** /os/organization — sections in reading order. */
export function OsOrganizationDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<OsOrganizationHeroSlide embedded={embedded} />}
    >
      <CapabilitySlide1 embedded={embedded} />
      <RhythmSlide2 embedded={embedded} />
      <GovernanceSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
