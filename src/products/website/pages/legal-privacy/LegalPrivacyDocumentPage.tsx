import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  LegalPrivacyHeroSlide,
  InformationWeCollectSlide1,
  HowInformationIsUsedSlide2,
  SecurityChangesAndContactSlide3,
} from './slides';

/** /legal/privacy — sections in reading order. */
export function LegalPrivacyDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<LegalPrivacyHeroSlide embedded={embedded} />}
    >
      <InformationWeCollectSlide1 embedded={embedded} />
      <HowInformationIsUsedSlide2 embedded={embedded} />
      <SecurityChangesAndContactSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
