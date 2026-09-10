import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  OsAuditHeroSlide,
  ActorSlide1,
  ActionSlide2,
  TraceCommercialApprovalAndReleaseSlide3,
} from './slides';

/** /os/audit — sections in reading order. */
export function OsAuditDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<OsAuditHeroSlide embedded={embedded} />}
    >
      <ActorSlide1 embedded={embedded} />
      <ActionSlide2 embedded={embedded} />
      <TraceCommercialApprovalAndReleaseSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
