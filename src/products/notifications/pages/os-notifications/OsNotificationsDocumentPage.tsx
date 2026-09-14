import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  OsNotificationsHeroSlide,
  DailyRhythmSlide1,
  WeeklyReviewSlide2,
  WorkflowUpdatesSlide3,
  AttentionThatMatchesYourGoalsSlide4,
  OpportunityPreferencesSlide5,
} from './slides';

/** /os/notifications — sections in reading order. */
export function OsNotificationsDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<OsNotificationsHeroSlide embedded={embedded} />}
    >
      <DailyRhythmSlide1 embedded={embedded} />
      <WeeklyReviewSlide2 embedded={embedded} />
      <WorkflowUpdatesSlide3 embedded={embedded} />
      <AttentionThatMatchesYourGoalsSlide4 embedded={embedded} />
      <OpportunityPreferencesSlide5 embedded={embedded} />
    </DocumentPageLayout>
  );
}
