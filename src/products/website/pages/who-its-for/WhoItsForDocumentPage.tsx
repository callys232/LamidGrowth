import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  WhoItsForHeroSlide,
  IndividualSlide1,
  ProfessionalSlide2,
  CreatorSlide3,
  OneMasterPropositionSlide4,
} from './slides';

/** /who-its-for — sections in reading order. */
export function WhoItsForDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<WhoItsForHeroSlide embedded={embedded} />}
    >
      <IndividualSlide1 embedded={embedded} />
      <ProfessionalSlide2 embedded={embedded} />
      <CreatorSlide3 embedded={embedded} />
      <OneMasterPropositionSlide4 embedded={embedded} />
    </DocumentPageLayout>
  );
}
