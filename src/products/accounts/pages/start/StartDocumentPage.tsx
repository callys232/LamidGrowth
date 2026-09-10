import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  StartHeroSlide,
  ChooseYourStartingContextSlide1,
  ChooseYourFirstObjectiveSlide2,
  StartBeforeYouConfigureEverythingSlide3,
} from './slides';

/** /start — sections in reading order. */
export function StartDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<StartHeroSlide embedded={embedded} />}
    >
      <ChooseYourStartingContextSlide1 embedded={embedded} />
      <ChooseYourFirstObjectiveSlide2 embedded={embedded} />
      <StartBeforeYouConfigureEverythingSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
