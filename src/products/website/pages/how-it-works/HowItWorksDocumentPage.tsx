import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  HowItWorksHeroSlide,
  ClaritySlide1,
  CapabilitySlide2,
  OutcomeGrowthSlide3,
  TheCycleStaysSimpleTheDepthAppearsWhenNeededSlide4,
} from './slides';

/** /how-it-works — sections in reading order. */
export function HowItWorksDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<HowItWorksHeroSlide embedded={embedded} />}
    >
      <ClaritySlide1 embedded={embedded} />
      <CapabilitySlide2 embedded={embedded} />
      <OutcomeGrowthSlide3 embedded={embedded} />
      <TheCycleStaysSimpleTheDepthAppearsWhenNeededSlide4 embedded={embedded} />
    </DocumentPageLayout>
  );
}
