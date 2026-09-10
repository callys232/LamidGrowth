import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  ProductCompanionHeroSlide,
  StartWithIntentSlide1,
  ContextBeforeAnswersSlide2,
  FromUnderstandingToActionSlide3,
  ContextYouControlSlide4,
} from './slides';

/** /product/companion — sections in reading order. */
export function ProductCompanionDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<ProductCompanionHeroSlide embedded={embedded} />}
    >
      <StartWithIntentSlide1 embedded={embedded} />
      <ContextBeforeAnswersSlide2 embedded={embedded} />
      <FromUnderstandingToActionSlide3 embedded={embedded} />
      <ContextYouControlSlide4 embedded={embedded} />
    </DocumentPageLayout>
  );
}
