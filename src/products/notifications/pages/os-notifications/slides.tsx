import { DocumentHeroSlide } from '../../../../shared/content/slides/DocumentHeroSlide';
import { DocumentSectionSlide } from '../../../../shared/content/slides/DocumentSectionSlide';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';

export function OsNotificationsHeroSlide({ embedded = false }: DocumentPageProps) {
  return <DocumentHeroSlide page={content} embedded={embedded} />;
}

/** Daily Rhythm */
export function DailyRhythmSlide1({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[0]}
      index={0}
      last={false}
      embedded={embedded}
    />
  );
}

/** Weekly Review */
export function WeeklyReviewSlide2({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[1]}
      index={1}
      last={false}
      embedded={embedded}
    />
  );
}

/** Workflow Updates */
export function WorkflowUpdatesSlide3({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide section={content.sections[2]} index={2} last={false} embedded={embedded} />
  );
}

/** Attention That Matches Your Goals */
export function AttentionThatMatchesYourGoalsSlide4({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide section={content.sections[3]} index={3} last={false} embedded={embedded} />
  );
}

/** Opportunity Preferences */
export function OpportunityPreferencesSlide5({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide section={content.sections[4]} index={4} last={true} embedded={embedded} />
  );
}
