import { DocumentHeroSlide } from '../../../../shared/content/slides/DocumentHeroSlide';
import { DocumentSectionSlide } from '../../../../shared/content/slides/DocumentSectionSlide';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';

export function OsConsistencyHeroSlide({ embedded = false }: DocumentPageProps) {
  return <DocumentHeroSlide page={content} embedded={embedded} />;
}

/** Next Action */
export function NextActionSlide1({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[0]}
      index={0}
      last={false}
      embedded={embedded}
    />
  );
}

/** Rhythm */
export function RhythmSlide2({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[1]}
      index={1}
      last={false}
      embedded={embedded}
    />
  );
}

/** Convert the Decision Into a Working Commitment */
export function ConvertTheDecisionIntoAWorkingCommitmentSlide3({
  embedded = false,
}: DocumentPageProps) {
  return (
    <DocumentSectionSlide section={content.sections[2]} index={2} last={true} embedded={embedded} />
  );
}
