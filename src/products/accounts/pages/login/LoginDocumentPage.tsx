import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  LoginHeroSlide,
  SignInSlide1,
  ProtectAccessWithoutAddingFrictionEverywhereSlide2,
  NewToLamidOneSlide3,
} from './slides';

/** /login — sections in reading order. */
export function LoginDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<LoginHeroSlide embedded={embedded} />}
    >
      <SignInSlide1 embedded={embedded} />
      <ProtectAccessWithoutAddingFrictionEverywhereSlide2 embedded={embedded} />
      <NewToLamidOneSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
