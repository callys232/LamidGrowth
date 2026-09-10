import { DocumentHeroSlide } from '../../../../shared/content/slides/DocumentHeroSlide';
import { DocumentSectionSlide } from '../../../../shared/content/slides/DocumentSectionSlide';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';

export function AboutStoryHeroSlide({ embedded = false }: DocumentPageProps) {
  return <DocumentHeroSlide page={content} embedded={embedded} />;
}

/** The Work Came First */
export function TheWorkCameFirstSlide1({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[0]}
      index={0}
      last={false}
      embedded={embedded}
    />
  );
}

/** But the Tools Were Not Connected */
export function ButTheToolsWereNotConnectedSlide2({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[1]}
      index={1}
      last={false}
      embedded={embedded}
    />
  );
}

/** That Had a Cost */
export function ThatHadACostSlide3({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[2]}
      index={2}
      last={false}
      embedded={embedded}
    />
  );
}

/** The Turning Point */
export function TheTurningPointSlide4({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[3]}
      index={3}
      last={false}
      embedded={embedded}
    />
  );
}

/** Built One Piece at a Time */
export function BuiltOnePieceAtATimeSlide5({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[4]}
      index={4}
      last={false}
      embedded={embedded}
    />
  );
}

/** Then AI Expanded What Was Possible */
export function ThenAiExpandedWhatWasPossibleSlide6({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[5]}
      index={5}
      last={false}
      embedded={embedded}
    />
  );
}

/** Why We Call It an Operating System */
export function WhyWeCallItAnOperatingSystemSlide7({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[6]}
      index={6}
      last={false}
      embedded={embedded}
    />
  );
}

/** Now the Story Becomes Yours */
export function NowTheStoryBecomesYoursSlide8({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide section={content.sections[7]} index={7} last={true} embedded={embedded} />
  );
}
