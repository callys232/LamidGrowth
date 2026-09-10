import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  AboutStoryHeroSlide,
  TheWorkCameFirstSlide1,
  ButTheToolsWereNotConnectedSlide2,
  ThatHadACostSlide3,
  TheTurningPointSlide4,
  BuiltOnePieceAtATimeSlide5,
  ThenAiExpandedWhatWasPossibleSlide6,
  WhyWeCallItAnOperatingSystemSlide7,
  NowTheStoryBecomesYoursSlide8,
} from './slides';

/** /about/story — sections in reading order. */
export function AboutStoryDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<AboutStoryHeroSlide embedded={embedded} />}
    >
      <TheWorkCameFirstSlide1 embedded={embedded} />
      <ButTheToolsWereNotConnectedSlide2 embedded={embedded} />
      <ThatHadACostSlide3 embedded={embedded} />
      <TheTurningPointSlide4 embedded={embedded} />
      <BuiltOnePieceAtATimeSlide5 embedded={embedded} />
      <ThenAiExpandedWhatWasPossibleSlide6 embedded={embedded} />
      <WhyWeCallItAnOperatingSystemSlide7 embedded={embedded} />
      <NowTheStoryBecomesYoursSlide8 embedded={embedded} />
    </DocumentPageLayout>
  );
}
