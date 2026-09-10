import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  PressHeroSlide,
  CompanyFactsSlide1,
  AnnouncementsSlide2,
  MediaAssetsSlide3,
} from './slides';

/** /press — sections in reading order. */
export function PressDocumentPage({ embedded = false }: DocumentPageProps) {
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
