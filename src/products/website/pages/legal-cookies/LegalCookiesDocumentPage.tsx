import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  LegalCookiesHeroSlide,
  NecessaryTechnologiesSlide1,
  PreferencesAndAnalyticsSlide2,
  AdvertisingAndThirdPartiesSlide3,
} from './slides';

/** /legal/cookies — sections in reading order. */
export function LegalCookiesDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<LegalCookiesHeroSlide embedded={embedded} />}
    >
      <NecessaryTechnologiesSlide1 embedded={embedded} />
      <PreferencesAndAnalyticsSlide2 embedded={embedded} />
      <AdvertisingAndThirdPartiesSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
