import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  SignupHeroSlide,
  CreateYourIdentitySlide1,
  ChooseAStartingContextSlide2,
  ContinueSlide3,
} from './slides';

/** /signup — sections in reading order. */
export function SignupDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<SignupHeroSlide embedded={embedded} />}
    >
      <CreateYourIdentitySlide1 embedded={embedded} />
      <ChooseAStartingContextSlide2 embedded={embedded} />
      <ContinueSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
