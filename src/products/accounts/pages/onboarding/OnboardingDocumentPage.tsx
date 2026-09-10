import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  OnboardingHeroSlide,
  ChooseYourContextSlide1,
  ChooseYourFirstObjectiveSlide2,
  StartWithOneRealDecisionSlide3,
} from './slides';

/** /onboarding — sections in reading order. */
export function OnboardingDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<OnboardingHeroSlide embedded={embedded} />}
    >
      <ChooseYourContextSlide1 embedded={embedded} />
      <ChooseYourFirstObjectiveSlide2 embedded={embedded} />
      <StartWithOneRealDecisionSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
