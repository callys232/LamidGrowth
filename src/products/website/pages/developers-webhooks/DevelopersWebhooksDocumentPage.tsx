import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  DevelopersWebhooksHeroSlide,
  EventModelSlide1,
  NotifyAnExternalSystemAfterApprovalSlide2,
  BuildForReliableTraceableDeliverySlide3,
} from './slides';

/** /developers/webhooks — sections in reading order. */
export function DevelopersWebhooksDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<DevelopersWebhooksHeroSlide embedded={embedded} />}
    >
      <EventModelSlide1 embedded={embedded} />
      <NotifyAnExternalSystemAfterApprovalSlide2 embedded={embedded} />
      <BuildForReliableTraceableDeliverySlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
