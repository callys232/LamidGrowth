import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  OsInsightsHeroSlide,
  EachMaterialInsightShouldShowSlide1,
  TurnAnInsightIntoActionSlide2,
} from './slides';

/** /os/insights — sections in reading order. */
export function OsInsightsDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<OsInsightsHeroSlide embedded={embedded} />}
    >
      <EachMaterialInsightShouldShowSlide1 embedded={embedded} />
      <TurnAnInsightIntoActionSlide2 embedded={embedded} />
    </DocumentPageLayout>
  );
}
