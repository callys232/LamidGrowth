import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { InfoPage, fromContent } from '../info/InfoPage';
import {
  PressHeroSlide,
  CompanyFactsSlide1,
  AnnouncementsSlide2,
  MediaAssetsSlide3,
} from './slides';

/** /press — sections in reading order. */
export function PressDocumentPage({ embedded = false }: DocumentPageProps) {
  if (!embedded)
    return (
      <InfoPage
        content={fromContent(content, {
          eyebrow: 'Press',
          primary: { label: 'Get started', to: '/signup' },
          secondary: { label: 'Contact us', to: '/contact' },
        })}
      />
    );
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<PressHeroSlide embedded={embedded} />}
    >
      <CompanyFactsSlide1 embedded={embedded} />
      <AnnouncementsSlide2 embedded={embedded} />
      <MediaAssetsSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
