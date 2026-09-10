import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  ProductWorkflowsHeroSlide,
  StartSimpleSlide1,
  RepeatWhatWorksSlide2,
  ProgressWithinTheBoundariesYouSetSlide3,
  ExecutionStaysConnectedToTheDecisionThatCreatedItSlide4,
} from './slides';

/** /product/workflows — sections in reading order. */
export function ProductWorkflowsDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<ProductWorkflowsHeroSlide embedded={embedded} />}
    >
      <StartSimpleSlide1 embedded={embedded} />
      <RepeatWhatWorksSlide2 embedded={embedded} />
      <ProgressWithinTheBoundariesYouSetSlide3 embedded={embedded} />
      <ExecutionStaysConnectedToTheDecisionThatCreatedItSlide4 embedded={embedded} />
    </DocumentPageLayout>
  );
}
