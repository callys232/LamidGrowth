import { DocumentHeroSlide } from '../../../../shared/content/slides/DocumentHeroSlide';
import { DocumentSectionSlide } from '../../../../shared/content/slides/DocumentSectionSlide';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';

export function WhoItsForProfessionalsHeroSlide({ embedded = false }: DocumentPageProps) {
  return <DocumentHeroSlide page={content} embedded={embedded} />;
}

/** Make Stronger Decisions */
export function MakeStrongerDecisionsSlide1({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[0]}
      index={0}
      last={false}
      embedded={embedded}
    />
  );
}

/** Build Relevant Capability */
export function BuildRelevantCapabilitySlide2({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[1]}
      index={1}
      last={false}
      embedded={embedded}
    />
  );
}

/** Create a Professional Rhythm */
export function CreateAProfessionalRhythmSlide3({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[2]}
      index={2}
      last={false}
      embedded={embedded}
    />
  );
}

/** Your Context Grows With You. */
export function YourContextGrowsWithYouSlide4({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[3]}
      index={3}
      last={false}
      embedded={embedded}
    />
  );
}

/** Turn a Career Goal Into a Living Path. */
export function TurnACareerGoalIntoALivingPathSlide5({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[4]}
      index={4}
      last={false}
      embedded={embedded}
    />
  );
}

/** See What Matters to the Goal */
export function SeeWhatMattersToTheGoalSlide6({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide section={content.sections[5]} index={5} last={true} embedded={embedded} />
  );
}
