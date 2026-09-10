import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { OsRhythmHeroSlide, TodaySlide1, ThisWeekSlide2, ThisMonthSlide3 } from './slides';

/** /os/rhythm — sections in reading order. */
export function OsRhythmDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<OsRhythmHeroSlide embedded={embedded} />}
    >
      <TodaySlide1 embedded={embedded} />
      <ThisWeekSlide2 embedded={embedded} />
      <ThisMonthSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
