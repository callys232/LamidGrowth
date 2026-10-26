import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { InfoPage, fromContent } from '../info/InfoPage';
import {
  HelpProductHeroSlide,
  CoreExperienceSlide1,
  DeeperCapabilitySlide2,
  OutcomeCollectionsSlide3,
} from './slides';

/** /help/product — sections in reading order. */
export function HelpProductDocumentPage({ embedded = false }: DocumentPageProps) {
  if (!embedded)
    return (
      <InfoPage
        content={fromContent(content, {
          eyebrow: 'Product help',
          primary: { label: 'Get started', to: '/signup' },
          secondary: { label: 'Contact us', to: '/contact' },
        })}
      />
    );
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<HelpProductHeroSlide embedded={embedded} />}
    >
      <CoreExperienceSlide1 embedded={embedded} />
      <DeeperCapabilitySlide2 embedded={embedded} />
      <OutcomeCollectionsSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
