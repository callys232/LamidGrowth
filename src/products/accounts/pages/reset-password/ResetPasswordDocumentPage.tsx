import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  ResetPasswordHeroSlide,
  NewPasswordSlide1,
  ConfirmPasswordSlide2,
  CompleteResetSlide3,
} from './slides';

/** /reset-password — sections in reading order. */
export function ResetPasswordDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<ResetPasswordHeroSlide embedded={embedded} />}
    >
      <NewPasswordSlide1 embedded={embedded} />
      <ConfirmPasswordSlide2 embedded={embedded} />
      <CompleteResetSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
