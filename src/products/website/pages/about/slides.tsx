import { DocumentHeroSlide } from '../../../../shared/content/slides/DocumentHeroSlide';
import { DocumentSectionSlide } from '../../../../shared/content/slides/DocumentSectionSlide';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';

export function AboutHeroSlide({ embedded = false }: DocumentPageProps) {
  return <DocumentHeroSlide page={content} embedded={embedded} />;
}

/** The Problem Wasn't That We Needed More Tools */
export function TheProblemWasnTThatWeNeededMoreToolsSlide1({
  embedded = false,
}: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[0]}
      index={0}
      last={false}
      embedded={embedded}
    />
  );
}

/** So We Started Connecting the Pieces */
export function SoWeStartedConnectingThePiecesSlide2({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[1]}
      index={1}
      last={false}
      embedded={embedded}
    />
  );
}

/** What LAMID ONE Is Today */
export function WhatLamidOneIsTodaySlide3({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[2]}
      index={2}
      last={false}
      embedded={embedded}
    />
  );
}

/** What That Means for You */
export function WhatThatMeansForYouSlide4({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[3]}
      index={3}
      last={false}
      embedded={embedded}
    />
  );
}

/** What We Believe */
export function WhatWeBelieveSlide5({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide section={content.sections[4]} index={4} last={true} embedded={embedded} />
  );
}
