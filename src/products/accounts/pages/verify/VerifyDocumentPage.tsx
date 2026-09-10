import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  VerifyHeroSlide,
  VerificationStatusSlide1,
  ResendVerificationSlide2,
  ContinueSlide3,
} from './slides';

/** /verify — sections in reading order. */
export function VerifyDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<VerifyHeroSlide embedded={embedded} />}
    >
      <VerificationStatusSlide1 embedded={embedded} />
      <ResendVerificationSlide2 embedded={embedded} />
      <ContinueSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
