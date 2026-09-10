import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  OsIntegrationsHeroSlide,
  AvailableSlide1,
  ConnectedSlide2,
  RequiresAttentionSlide3,
} from './slides';

/** /os/integrations — sections in reading order. */
export function OsIntegrationsDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<OsIntegrationsHeroSlide embedded={embedded} />}
    >
      <AvailableSlide1 embedded={embedded} />
      <ConnectedSlide2 embedded={embedded} />
      <RequiresAttentionSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
