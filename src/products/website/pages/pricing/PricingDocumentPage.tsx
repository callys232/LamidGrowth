import { SkeletonCards } from '../../../../shared/ui/Skeleton';
import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import { DocumentSectionSlide } from '../../../../shared/content/slides/DocumentSectionSlide';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { BundleBuilder } from './BundleBuilder';
import { PricingCards, PricingCompare, PricingHero, PricingNav, PricingTiers } from './PricingFlow';
import {
  PricingHeroSlide,
  PersonalSlide1,
  ProfessionalSlide2,
  TeamSlide3,
  ExpandTheOsNotACollectionOfSeparateProductsSlide4,
} from './slides';
import { usePublicBillables } from './usePublicBillables';
import './bundle-builder.css';
import './pricing-flow.css';

/** /pricing follows a HubSpot-style pricing flow (see PricingFlow.tsx): hero, sticky plan bar,
 * tier cards, live price cards, bundle calculator, the full billables table, then the closing
 * band. Embedded mode (the collapsed reference used on other pages) stays pure canonical copy. */
export function PricingDocumentPage({ embedded = false }: DocumentPageProps) {
  if (embedded) {
    return (
      <DocumentPageLayout page={content} embedded hero={<PricingHeroSlide embedded />}>
        <PersonalSlide1 embedded />
        <ProfessionalSlide2 embedded />
        <TeamSlide3 embedded />
        <ExpandTheOsNotACollectionOfSeparateProductsSlide4 embedded />
      </DocumentPageLayout>
    );
  }
  return <PricingPage />;
}

function PricingPage() {
  const { billables, bundles, error } = usePublicBillables();
  const closing = content.sections[content.sections.length - 1];
  return (
    <DocumentPageLayout page={content} hero={<PricingHero />} nav={<PricingNav />}>
      <PricingTiers />
      <PricingCards billables={billables} bundles={bundles} error={error} />
      <section className="pricing-block" id="bundle" aria-labelledby="pricing-bundle-title">
        <header className="pricing-block-head">
          <h2 id="pricing-bundle-title">Create a Bundle</h2>
        </header>
        {billables ? (
          <BundleBuilder billables={billables} />
        ) : (
          !error && <SkeletonCards count={2} />
        )}
      </section>
      <PricingCompare billables={billables} />
      <DocumentSectionSlide section={closing} index={content.sections.length - 1} last />
    </DocumentPageLayout>
  );
}
