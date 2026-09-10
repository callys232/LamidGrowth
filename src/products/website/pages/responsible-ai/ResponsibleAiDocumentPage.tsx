import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  ResponsibleAiHeroSlide,
  ContextPrivacySlide1,
  MemoryContinuityControlSlide2,
  ProgressionDoesNotEqualUnlimitedAuthoritySlide3,
  MoreCapableAiRequiresMoreDeliberateGovernanceSlide4,
} from './slides';

/** /responsible-ai — sections in reading order. */
export function ResponsibleAiDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<ResponsibleAiHeroSlide embedded={embedded} />}
    >
      <ContextPrivacySlide1 embedded={embedded} />
      <MemoryContinuityControlSlide2 embedded={embedded} />
      <ProgressionDoesNotEqualUnlimitedAuthoritySlide3 embedded={embedded} />
      <MoreCapableAiRequiresMoreDeliberateGovernanceSlide4 embedded={embedded} />
    </DocumentPageLayout>
  );
}
