import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  OsBusinessHeroSlide,
  CurrentPrioritiesSlide1,
  OperationalClaritySlide2,
  PeopleCapabilitySlide3,
} from './slides';

/** /os/business — sections in reading order. */
export function OsBusinessDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<OsBusinessHeroSlide embedded={embedded} />}
    >
      <CurrentPrioritiesSlide1 embedded={embedded} />
      <OperationalClaritySlide2 embedded={embedded} />
      <PeopleCapabilitySlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
