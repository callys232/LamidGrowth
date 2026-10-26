import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { InfoPage, fromContent } from '../info/InfoPage';
import {
  DevelopersWebhooksHeroSlide,
  EventModelSlide1,
  NotifyAnExternalSystemAfterApprovalSlide2,
  BuildForReliableTraceableDeliverySlide3,
} from './slides';

/** /developers/webhooks — sections in reading order. */
export function DevelopersWebhooksDocumentPage({ embedded = false }: DocumentPageProps) {
  if (!embedded)
    return (
      <InfoPage
        content={fromContent(content, {
          eyebrow: 'Webhooks',
          primary: { label: 'Get started', to: '/signup' },
          secondary: { label: 'Contact us', to: '/contact' },
        })}
      />
    );
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
