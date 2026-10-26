import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { InfoPage, info } from '../info/InfoPage';
import {
  SecurityHeroSlide,
  IdentityAccountProtectionSlide1,
  AuthorizationBoundariesSlide2,
  EvidenceSlide3,
  SecurityEvaluationSlide4,
} from './slides';

/** /security — sections in reading order. */
export function SecurityDocumentPage({ embedded = false }: DocumentPageProps) {
  if (!embedded) return <InfoPage content={info.security} />;
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<SecurityHeroSlide embedded={embedded} />}
    >
      <IdentityAccountProtectionSlide1 embedded={embedded} />
      <AuthorizationBoundariesSlide2 embedded={embedded} />
      <EvidenceSlide3 embedded={embedded} />
      <SecurityEvaluationSlide4 embedded={embedded} />
    </DocumentPageLayout>
  );
}
