import { DocumentHeroSlide } from '../../../../shared/content/slides/DocumentHeroSlide';
import { DocumentSectionSlide } from '../../../../shared/content/slides/DocumentSectionSlide';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';

export function EnterpriseContactHeroSlide({ embedded = false }: DocumentPageProps) {
  return <DocumentHeroSlide page={content} embedded={embedded} />;
}

/** Your Organization */
export function YourOrganizationSlide1({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[0]}
      index={0}
      last={false}
      embedded={embedded}
    />
  );
}

/** Your Objective */
export function YourObjectiveSlide2({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[1]}
      index={1}
      last={false}
      embedded={embedded}
    />
  );
}

/** Your Environment */
export function YourEnvironmentSlide3({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[2]}
      index={2}
      last={false}
      embedded={embedded}
    />
  );
}

/** Next Step */
export function NextStepSlide4({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide section={content.sections[3]} index={3} last={true} embedded={embedded} />
  );
}
