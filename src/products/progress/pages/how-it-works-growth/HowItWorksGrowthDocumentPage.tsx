import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  HowItWorksGrowthHeroSlide,
  PersonalGrowthSlide1,
  OrganizationalGrowthSlide2,
  GrowWithoutLosingControlSlide3,
  GrowthChangesByContextTheOperatingPrinciplesStayConsistentSlide4,
  KeepGoalsConnectedSlide5,
} from './slides';

/** /how-it-works/growth — sections in reading order. */
export function HowItWorksGrowthDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<HowItWorksGrowthHeroSlide embedded={embedded} />}
    >
      <PersonalGrowthSlide1 embedded={embedded} />
      <OrganizationalGrowthSlide2 embedded={embedded} />
      <GrowWithoutLosingControlSlide3 embedded={embedded} />
      <GrowthChangesByContextTheOperatingPrinciplesStayConsistentSlide4 embedded={embedded} />
      <KeepGoalsConnectedSlide5 embedded={embedded} />
    </DocumentPageLayout>
  );
}
