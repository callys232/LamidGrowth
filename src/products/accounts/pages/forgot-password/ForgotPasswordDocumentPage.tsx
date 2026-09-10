import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { ForgotPasswordHeroSlide, EmailSlide1, PrivacySafeRecoverySlide2 } from './slides';

/** /forgot-password — sections in reading order. */
export function ForgotPasswordDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<ForgotPasswordHeroSlide embedded={embedded} />}
    >
      <EmailSlide1 embedded={embedded} />
      <PrivacySafeRecoverySlide2 embedded={embedded} />
    </DocumentPageLayout>
  );
}
