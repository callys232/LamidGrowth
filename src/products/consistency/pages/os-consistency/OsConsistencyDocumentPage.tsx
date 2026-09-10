import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  OsConsistencyHeroSlide,
  NextActionSlide1,
  RhythmSlide2,
  ConvertTheDecisionIntoAWorkingCommitmentSlide3,
} from './slides';

/** /os/consistency — sections in reading order. */
export function OsConsistencyDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<OsConsistencyHeroSlide embedded={embedded} />}
    >
      <NextActionSlide1 embedded={embedded} />
      <RhythmSlide2 embedded={embedded} />
      <ConvertTheDecisionIntoAWorkingCommitmentSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
