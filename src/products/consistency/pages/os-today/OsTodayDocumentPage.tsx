import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  OsTodayHeroSlide,
  ClaritySlide1,
  CapabilitySlide2,
  ResolveTodaySPrioritySlide3,
} from './slides';

/** /os/today — sections in reading order. */
export function OsTodayDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<OsTodayHeroSlide embedded={embedded} />}
    >
      <ClaritySlide1 embedded={embedded} />
      <CapabilitySlide2 embedded={embedded} />
      <ResolveTodaySPrioritySlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
