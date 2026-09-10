import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  HowItWorksRhythmHeroSlide,
  TodaySlide1,
  ThisWeekSlide2,
  OrganizationSlide3,
  SeeProgressInAnEvolvingContextNotJustAsAScoreSlide4,
} from './slides';

/** /how-it-works/rhythm — sections in reading order. */
export function HowItWorksRhythmDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<HowItWorksRhythmHeroSlide embedded={embedded} />}
    >
      <TodaySlide1 embedded={embedded} />
      <ThisWeekSlide2 embedded={embedded} />
      <OrganizationSlide3 embedded={embedded} />
      <SeeProgressInAnEvolvingContextNotJustAsAScoreSlide4 embedded={embedded} />
    </DocumentPageLayout>
  );
}
