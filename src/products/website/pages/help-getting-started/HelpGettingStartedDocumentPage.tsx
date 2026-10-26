import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { InfoPage, fromContent } from '../info/InfoPage';
import {
  HelpGettingStartedHeroSlide,
  Step1ChooseYourContextSlide1,
  Step4ReviewProgressSlide2,
  CompleteYourFirstDecisionCycleSlide3,
} from './slides';

/** /help/getting-started — sections in reading order. */
export function HelpGettingStartedDocumentPage({ embedded = false }: DocumentPageProps) {
  if (!embedded)
    return (
      <InfoPage
        content={fromContent(content, {
          eyebrow: 'Getting started',
          primary: { label: 'Get started', to: '/signup' },
          secondary: { label: 'Contact us', to: '/contact' },
        })}
      />
    );
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<HelpGettingStartedHeroSlide embedded={embedded} />}
    >
      <Step1ChooseYourContextSlide1 embedded={embedded} />
      <Step4ReviewProgressSlide2 embedded={embedded} />
      <CompleteYourFirstDecisionCycleSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
