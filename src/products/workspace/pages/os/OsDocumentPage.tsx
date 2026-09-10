import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { OsHeroSlide, TodaySlide1, ProgressSlide2, RhythmSlide3 } from './slides';

/** /os — sections in reading order. */
export function OsDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<OsHeroSlide embedded={embedded} />}
    >
      <TodaySlide1 embedded={embedded} />
      <ProgressSlide2 embedded={embedded} />
      <RhythmSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
