import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  WhoItsForFoundersHeroSlide,
  BusinessClaritySlide1,
  FinancialContextSlide2,
  TeamCapabilitySlide3,
  OneFounderManyContextsOneOperatingSystemSlide4,
} from './slides';

/** /who-its-for/founders — sections in reading order. */
export function WhoItsForFoundersDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<WhoItsForFoundersHeroSlide embedded={embedded} />}
    >
      <BusinessClaritySlide1 embedded={embedded} />
      <FinancialContextSlide2 embedded={embedded} />
      <TeamCapabilitySlide3 embedded={embedded} />
      <OneFounderManyContextsOneOperatingSystemSlide4 embedded={embedded} />
    </DocumentPageLayout>
  );
}
