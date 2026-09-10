import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { HelpHeroSlide, BrowseByNeedSlide1, GetUnblockedQuicklySlide2 } from './slides';

/** /help — sections in reading order. */
export function HelpDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<HelpHeroSlide embedded={embedded} />}
    >
      <BrowseByNeedSlide1 embedded={embedded} />
      <GetUnblockedQuicklySlide2 embedded={embedded} />
    </DocumentPageLayout>
  );
}
