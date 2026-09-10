import { DocumentHeroSlide } from '../../../../shared/content/slides/DocumentHeroSlide';
import { DocumentSectionSlide } from '../../../../shared/content/slides/DocumentSectionSlide';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';

export function WhoItsForIndividualsHeroSlide({ embedded = false }: DocumentPageProps) {
  return <DocumentHeroSlide page={content} embedded={embedded} />;
}

/** Set the Focus */
export function SetTheFocusSlide1({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[0]}
      index={0}
      last={false}
      embedded={embedded}
    />
  );
}

/** Strengthen Capability */
export function StrengthenCapabilitySlide2({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[1]}
      index={1}
      last={false}
      embedded={embedded}
    />
  );
}

/** Keep Progress Moving */
export function KeepProgressMovingSlide3({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[2]}
      index={2}
      last={false}
      embedded={embedded}
    />
  );
}

/** Your Personal Context Stays Personal. */
export function YourPersonalContextStaysPersonalSlide4({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide section={content.sections[3]} index={3} last={true} embedded={embedded} />
  );
}
