import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  AboutLeadershipHeroSlide,
  FounderLedTodaySlide1,
  ResponsibilityBeforeTitleSlide2,
  ExperienceWithContextSlide3,
} from './slides';

/** /about/leadership — sections in reading order. */
export function AboutLeadershipDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<AboutLeadershipHeroSlide embedded={embedded} />}
    >
      <FounderLedTodaySlide1 embedded={embedded} />
      <ResponsibilityBeforeTitleSlide2 embedded={embedded} />
      <ExperienceWithContextSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
