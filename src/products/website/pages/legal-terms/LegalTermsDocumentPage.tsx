import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  LegalTermsHeroSlide,
  EligibilityAndAccountsSlide1,
  ServiceScopeSlide2,
  PlansAndPaymentSlide3,
} from './slides';

/** /legal/terms — sections in reading order. */
export function LegalTermsDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<LegalTermsHeroSlide embedded={embedded} />}
    >
      <EligibilityAndAccountsSlide1 embedded={embedded} />
      <ServiceScopeSlide2 embedded={embedded} />
      <PlansAndPaymentSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
