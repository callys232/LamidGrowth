import { DocumentHeroSlide } from '../../../../shared/content/slides/DocumentHeroSlide';
import { DocumentSectionSlide } from '../../../../shared/content/slides/DocumentSectionSlide';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';

export function OsWorkflowsHeroSlide({ embedded = false }: DocumentPageProps) {
  return <DocumentHeroSlide page={content} embedded={embedded} />;
}

/** Active Workflows */
export function ActiveWorkflowsSlide1({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[0]}
      index={0}
      last={false}
      embedded={embedded}
    />
  );
}

/** Templates */
export function TemplatesSlide2({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[1]}
      index={1}
      last={false}
      embedded={embedded}
    />
  );
}

/** Convert a Decision Into a Repeatable Process */
export function ConvertADecisionIntoARepeatableProcessSlide3({
  embedded = false,
}: DocumentPageProps) {
  return (
    <DocumentSectionSlide section={content.sections[2]} index={2} last={true} embedded={embedded} />
  );
}
