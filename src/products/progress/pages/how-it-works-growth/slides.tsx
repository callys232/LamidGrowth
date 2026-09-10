import { DocumentHeroSlide } from '../../../../shared/content/slides/DocumentHeroSlide';
import { DocumentSectionSlide } from '../../../../shared/content/slides/DocumentSectionSlide';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';

export function HowItWorksGrowthHeroSlide({ embedded = false }: DocumentPageProps) {
  return <DocumentHeroSlide page={content} embedded={embedded} />;
}

/** Personal Growth */
export function PersonalGrowthSlide1({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[0]}
      index={0}
      last={false}
      embedded={embedded}
    />
  );
}

/** Organizational Growth */
export function OrganizationalGrowthSlide2({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[1]}
      index={1}
      last={false}
      embedded={embedded}
    />
  );
}

/** Grow Without Losing Control */
export function GrowWithoutLosingControlSlide3({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[2]}
      index={2}
      last={false}
      embedded={embedded}
    />
  );
}

/** Growth Changes by Context. The Operating Principles Stay Consistent. */
export function GrowthChangesByContextTheOperatingPrinciplesStayConsistentSlide4({
  embedded = false,
}: DocumentPageProps) {
  return (
    <DocumentSectionSlide section={content.sections[3]} index={3} last={true} embedded={embedded} />
  );
}
