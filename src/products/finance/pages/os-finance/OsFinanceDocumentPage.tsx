import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  OsFinanceHeroSlide,
  CashPositionSlide1,
  PricingSlide2,
  TestAHiringPlanSlide3,
} from './slides';

/** /os/finance — sections in reading order. */
export function OsFinanceDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<OsFinanceHeroSlide embedded={embedded} />}
    >
      <CashPositionSlide1 embedded={embedded} />
      <PricingSlide2 embedded={embedded} />
      <TestAHiringPlanSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
