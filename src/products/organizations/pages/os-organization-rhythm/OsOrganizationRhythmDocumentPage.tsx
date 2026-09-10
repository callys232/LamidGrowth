import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  OsOrganizationRhythmHeroSlide,
  SharedPrioritiesSlide1,
  CapabilityPatternsSlide2,
  ExecutionRhythmSlide3,
} from './slides';

/** /os/organization/rhythm — sections in reading order. */
export function OsOrganizationRhythmDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<OsOrganizationRhythmHeroSlide embedded={embedded} />}
    >
      <SharedPrioritiesSlide1 embedded={embedded} />
      <CapabilityPatternsSlide2 embedded={embedded} />
      <ExecutionRhythmSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
