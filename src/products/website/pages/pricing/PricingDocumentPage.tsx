import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  PricingHeroSlide,
  PersonalSlide1,
  ProfessionalSlide2,
  TeamSlide3,
  ExpandTheOsNotACollectionOfSeparateProductsSlide4,
} from './slides';

/** /pricing — sections in reading order. */
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
      <ExpandTheOsNotACollectionOfSeparateProductsSlide4 embedded={embedded} />
    </DocumentPageLayout>
  );
}
