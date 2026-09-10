import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  AboutHeroSlide,
  TheProblemWasnTThatWeNeededMoreToolsSlide1,
  SoWeStartedConnectingThePiecesSlide2,
  WhatLamidOneIsTodaySlide3,
  WhatThatMeansForYouSlide4,
  WhatWeBelieveSlide5,
} from './slides';

/** /about — sections in reading order. */
export function AboutDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<AboutHeroSlide embedded={embedded} />}
    >
      <TheProblemWasnTThatWeNeededMoreToolsSlide1 embedded={embedded} />
      <SoWeStartedConnectingThePiecesSlide2 embedded={embedded} />
      <WhatLamidOneIsTodaySlide3 embedded={embedded} />
      <WhatThatMeansForYouSlide4 embedded={embedded} />
      <WhatWeBelieveSlide5 embedded={embedded} />
    </DocumentPageLayout>
  );
}
