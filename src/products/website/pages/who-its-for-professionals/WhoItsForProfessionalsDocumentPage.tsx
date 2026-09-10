import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  WhoItsForProfessionalsHeroSlide,
  MakeStrongerDecisionsSlide1,
  BuildRelevantCapabilitySlide2,
  CreateAProfessionalRhythmSlide3,
  YourContextGrowsWithYouSlide4,
} from './slides';

/** /who-its-for/professionals — sections in reading order. */
export function WhoItsForProfessionalsDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<WhoItsForProfessionalsHeroSlide embedded={embedded} />}
    >
      <MakeStrongerDecisionsSlide1 embedded={embedded} />
      <BuildRelevantCapabilitySlide2 embedded={embedded} />
      <CreateAProfessionalRhythmSlide3 embedded={embedded} />
      <YourContextGrowsWithYouSlide4 embedded={embedded} />
    </DocumentPageLayout>
  );
}
