import { DocumentHeroSlide } from '../../../../shared/content/slides/DocumentHeroSlide';
import { DocumentSectionSlide } from '../../../../shared/content/slides/DocumentSectionSlide';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';

export function DevelopersChangelogHeroSlide({ embedded = false }: DocumentPageProps) {
  return <DocumentHeroSlide page={content} embedded={embedded} />;
}

/** Each Entry Includes */
export function EachEntryIncludesSlide1({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[0]}
      index={0}
      last={false}
      embedded={embedded}
    />
  );
}

/** Breaking Changes */
export function BreakingChangesSlide2({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide section={content.sections[1]} index={1} last={true} embedded={embedded} />
  );
}
