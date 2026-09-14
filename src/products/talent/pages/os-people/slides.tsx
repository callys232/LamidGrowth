import { DocumentHeroSlide } from '../../../../shared/content/slides/DocumentHeroSlide';
import { DocumentSectionSlide } from '../../../../shared/content/slides/DocumentSectionSlide';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';

export function OsPeopleHeroSlide({ embedded = false }: DocumentPageProps) {
  return <DocumentHeroSlide page={content} embedded={embedded} />;
}

/** Capability Requirements */
export function CapabilityRequirementsSlide1({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[0]}
      index={0}
      last={false}
      embedded={embedded}
    />
  );
}

/** Strengths */
export function StrengthsSlide2({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[1]}
      index={1}
      last={false}
      embedded={embedded}
    />
  );
}

/** Gaps */
export function GapsSlide3({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide section={content.sections[2]} index={2} last={false} embedded={embedded} />
  );
}

/** Career & Role Pathways */
export function CareerAndRolePathwaysSlide4({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide section={content.sections[3]} index={3} last={false} embedded={embedded} />
  );
}

/** Choose How to Close the Gap */
export function ChooseHowToCloseTheGapSlide5({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide section={content.sections[4]} index={4} last={true} embedded={embedded} />
  );
}
