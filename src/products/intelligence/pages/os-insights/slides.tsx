import { DocumentHeroSlide } from '../../../../shared/content/slides/DocumentHeroSlide';
import { DocumentSectionSlide } from '../../../../shared/content/slides/DocumentSectionSlide';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';

export function OsInsightsHeroSlide({ embedded = false }: DocumentPageProps) {
  return <DocumentHeroSlide page={content} embedded={embedded} />;
}

/** Each Material Insight Should Show */
export function EachMaterialInsightShouldShowSlide1({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[0]}
      index={0}
      last={false}
      embedded={embedded}
    />
  );
}

/** Turn an Insight Into Action */
export function TurnAnInsightIntoActionSlide2({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide section={content.sections[1]} index={1} last={true} embedded={embedded} />
  );
}
