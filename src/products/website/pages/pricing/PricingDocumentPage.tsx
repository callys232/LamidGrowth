import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { BillablesSection } from './BillablesSection';
import {
  PricingHeroSlide,
  PersonalSlide1,
  ProfessionalSlide2,
  TeamSlide3,
  ExpandTheOsNotACollectionOfSeparateProductsSlide4,
} from './slides';

/** /pricing — canonical narrative sections in reading order, then the live billables/bundle price
 * list (BillablesSection — not canonical copy, so it isn't itself numbered/tracked by the
 * copy-fidelity test), then the closing CTA. Embedded mode (the collapsed reference used on other
 * pages) intentionally omits BillablesSection — that view is meant to stay pure canonical copy. */
export function PricingDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<PricingHeroSlide embedded={embedded} />}
    >
      <PersonalSlide1 embedded={embedded} />
      <ProfessionalSlide2 embedded={embedded} />
      <TeamSlide3 embedded={embedded} />
      {!embedded && <BillablesSection />}
      <ExpandTheOsNotACollectionOfSeparateProductsSlide4 embedded={embedded} />
    </DocumentPageLayout>
  );
}
