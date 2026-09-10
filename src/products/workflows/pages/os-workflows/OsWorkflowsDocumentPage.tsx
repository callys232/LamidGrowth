import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  OsWorkflowsHeroSlide,
  ActiveWorkflowsSlide1,
  TemplatesSlide2,
  ConvertADecisionIntoARepeatableProcessSlide3,
} from './slides';

/** /os/workflows — sections in reading order. */
export function OsWorkflowsDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<OsWorkflowsHeroSlide embedded={embedded} />}
    >
      <ActiveWorkflowsSlide1 embedded={embedded} />
      <TemplatesSlide2 embedded={embedded} />
      <ConvertADecisionIntoARepeatableProcessSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
