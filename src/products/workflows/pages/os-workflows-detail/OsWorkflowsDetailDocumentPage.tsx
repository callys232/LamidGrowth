import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  OsWorkflowsDetailHeroSlide,
  OutcomeSlide1,
  ApprovalsSlide2,
  DefineHowCompletionWillBeJudgedSlide3,
} from './slides';

/** /os/workflows/[id] — sections in reading order. */
export function OsWorkflowsDetailDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<OsWorkflowsDetailHeroSlide embedded={embedded} />}
    >
      <OutcomeSlide1 embedded={embedded} />
      <ApprovalsSlide2 embedded={embedded} />
      <DefineHowCompletionWillBeJudgedSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
