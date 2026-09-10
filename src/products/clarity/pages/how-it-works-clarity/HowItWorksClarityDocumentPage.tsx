import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  HowItWorksClarityHeroSlide,
  ReduceNoiseSlide1,
  UnderstandContextSlide2,
  RevealPatternsSlide3,
  BetterActionStartsWithBetterUnderstandingSlide4,
} from './slides';

/** /how-it-works/clarity — sections in reading order. */
export function HowItWorksClarityDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<HowItWorksClarityHeroSlide embedded={embedded} />}
    >
      <ReduceNoiseSlide1 embedded={embedded} />
      <UnderstandContextSlide2 embedded={embedded} />
      <RevealPatternsSlide3 embedded={embedded} />
      <BetterActionStartsWithBetterUnderstandingSlide4 embedded={embedded} />
    </DocumentPageLayout>
  );
}
