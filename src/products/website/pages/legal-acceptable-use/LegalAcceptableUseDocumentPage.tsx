import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  LegalAcceptableUseHeroSlide,
  ProhibitedActivitySlide1,
  AiAndAutomationSlide2,
  OrganizationalDataAndAccessSlide3,
} from './slides';

/** /legal/acceptable-use — sections in reading order. */
export function LegalAcceptableUseDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<LegalAcceptableUseHeroSlide embedded={embedded} />}
    >
      <ProhibitedActivitySlide1 embedded={embedded} />
      <AiAndAutomationSlide2 embedded={embedded} />
      <OrganizationalDataAndAccessSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
