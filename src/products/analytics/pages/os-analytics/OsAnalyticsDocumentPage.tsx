import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  OsAnalyticsHeroSlide,
  EveryMetricShowsSlide1,
  ViewsSlide2,
  ExplainADeliveryTrendSlide3,
} from './slides';

/** /os/analytics — sections in reading order. */
export function OsAnalyticsDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<OsAnalyticsHeroSlide embedded={embedded} />}
    >
      <EveryMetricShowsSlide1 embedded={embedded} />
      <ViewsSlide2 embedded={embedded} />
      <ExplainADeliveryTrendSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
