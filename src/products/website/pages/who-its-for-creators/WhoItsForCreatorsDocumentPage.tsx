import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  WhoItsForCreatorsHeroSlide,
  ClarifyTheDirectionSlide1,
  ExploreOpportunitySlide2,
  BuildTheBusinessBehindTheWorkSlide3,
  StructureSupportsTheWorkItDoesNotReplaceItSlide4,
} from './slides';

/** /who-its-for/creators — sections in reading order. */
export function WhoItsForCreatorsDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<WhoItsForCreatorsHeroSlide embedded={embedded} />}
    >
      <ClarifyTheDirectionSlide1 embedded={embedded} />
      <ExploreOpportunitySlide2 embedded={embedded} />
      <BuildTheBusinessBehindTheWorkSlide3 embedded={embedded} />
      <StructureSupportsTheWorkItDoesNotReplaceItSlide4 embedded={embedded} />
    </DocumentPageLayout>
  );
}
