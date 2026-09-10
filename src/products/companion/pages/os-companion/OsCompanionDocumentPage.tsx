import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  OsCompanionHeroSlide,
  ObjectiveSlide1,
  ContextSlide2,
  RelevantIntelligenceSlide3,
} from './slides';

/** /os/companion — sections in reading order. */
export function OsCompanionDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<OsCompanionHeroSlide embedded={embedded} />}
    >
      <ObjectiveSlide1 embedded={embedded} />
      <ContextSlide2 embedded={embedded} />
      <RelevantIntelligenceSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
