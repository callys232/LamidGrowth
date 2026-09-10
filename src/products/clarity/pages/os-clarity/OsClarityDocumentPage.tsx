import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  OsClarityHeroSlide,
  DefineTheObjectiveSlide1,
  AddContextSlide2,
  TurnAmbiguityIntoADecisionFrameSlide3,
} from './slides';

/** /os/clarity — sections in reading order. */
export function OsClarityDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<OsClarityHeroSlide embedded={embedded} />}
    >
      <DefineTheObjectiveSlide1 embedded={embedded} />
      <AddContextSlide2 embedded={embedded} />
      <TurnAmbiguityIntoADecisionFrameSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
