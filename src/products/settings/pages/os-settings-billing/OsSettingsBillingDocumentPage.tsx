import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  OsSettingsBillingHeroSlide,
  CurrentSubscriptionSlide1,
  PaymentMethodSlide2,
  InvoicesSlide3,
} from './slides';

/** /os/settings/billing — sections in reading order. */
export function OsSettingsBillingDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<OsSettingsBillingHeroSlide embedded={embedded} />}
    >
      <CurrentSubscriptionSlide1 embedded={embedded} />
      <PaymentMethodSlide2 embedded={embedded} />
      <InvoicesSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
