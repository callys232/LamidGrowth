import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  HowItWorksConsistencyHeroSlide,
  MoveTheNextActionSlide1,
  BuildARhythmSlide2,
  ReviewTheResultSlide3,
  ConsistencyKeepsImportantWorkMovingWithoutBlockingAdaptationSlide4,
} from './slides';

/** /how-it-works/consistency — sections in reading order. */
export function HowItWorksConsistencyDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<HowItWorksConsistencyHeroSlide embedded={embedded} />}
    >
      <MoveTheNextActionSlide1 embedded={embedded} />
      <BuildARhythmSlide2 embedded={embedded} />
      <ReviewTheResultSlide3 embedded={embedded} />
      <ConsistencyKeepsImportantWorkMovingWithoutBlockingAdaptationSlide4 embedded={embedded} />
    </DocumentPageLayout>
  );
}
