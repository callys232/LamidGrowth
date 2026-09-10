import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  OsCapabilityHeroSlide,
  RequirementsSlide1,
  AvailableNowSlide2,
  CloseTheCriticalGapFirstSlide3,
} from './slides';

/** /os/capability — sections in reading order. */
export function OsCapabilityDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<OsCapabilityHeroSlide embedded={embedded} />}
    >
      <RequirementsSlide1 embedded={embedded} />
      <AvailableNowSlide2 embedded={embedded} />
      <CloseTheCriticalGapFirstSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
