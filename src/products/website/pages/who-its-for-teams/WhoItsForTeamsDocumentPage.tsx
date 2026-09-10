import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  WhoItsForTeamsHeroSlide,
  SharedPrioritiesSlide1,
  CapabilitySlide2,
  RhythmSlide3,
  AlignmentBecomesVisibleInTheWorkSlide4,
} from './slides';

/** /who-its-for/teams — sections in reading order. */
export function WhoItsForTeamsDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<WhoItsForTeamsHeroSlide embedded={embedded} />}
    >
      <SharedPrioritiesSlide1 embedded={embedded} />
      <CapabilitySlide2 embedded={embedded} />
      <RhythmSlide3 embedded={embedded} />
      <AlignmentBecomesVisibleInTheWorkSlide4 embedded={embedded} />
    </DocumentPageLayout>
  );
}
