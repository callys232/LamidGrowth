import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  OsProgressHeroSlide,
  ClarityPatternsSlide1,
  OutcomesSlide2,
  TraceAnOutcomeBackToTheWorkSlide3,
} from './slides';

/** /os/progress — sections in reading order. */
export function OsProgressDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<OsProgressHeroSlide embedded={embedded} />}
    >
      <ClarityPatternsSlide1 embedded={embedded} />
      <OutcomesSlide2 embedded={embedded} />
      <TraceAnOutcomeBackToTheWorkSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
