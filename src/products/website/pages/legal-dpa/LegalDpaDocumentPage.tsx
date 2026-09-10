import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  LegalDpaHeroSlide,
  RolesAndInstructionsSlide1,
  ConfidentialityAndSecuritySlide2,
  SubprocessorsSlide3,
} from './slides';

/** /legal/dpa — sections in reading order. */
export function LegalDpaDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<LegalDpaHeroSlide embedded={embedded} />}
    >
      <RolesAndInstructionsSlide1 embedded={embedded} />
      <ConfidentialityAndSecuritySlide2 embedded={embedded} />
      <SubprocessorsSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
