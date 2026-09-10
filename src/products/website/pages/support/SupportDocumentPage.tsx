import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  SupportHeroSlide,
  ChooseATopicSlide1,
  DescribeTheOutcomeSlide2,
  SubmitSlide3,
} from './slides';

/** /support — sections in reading order. */
export function SupportDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<SupportHeroSlide embedded={embedded} />}
    >
      <ChooseATopicSlide1 embedded={embedded} />
      <DescribeTheOutcomeSlide2 embedded={embedded} />
      <SubmitSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
