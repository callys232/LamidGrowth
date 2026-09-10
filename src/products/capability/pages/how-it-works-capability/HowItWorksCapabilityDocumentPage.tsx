import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  HowItWorksCapabilityHeroSlide,
  CapabilityIsMoreThanSkillSlide1,
  PersonalCapabilitySlide2,
  OrganizationalCapabilitySlide3,
  GrowthWithoutCapabilityBecomesPressureSlide4,
} from './slides';

/** /how-it-works/capability — sections in reading order. */
export function HowItWorksCapabilityDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<HowItWorksCapabilityHeroSlide embedded={embedded} />}
    >
      <CapabilityIsMoreThanSkillSlide1 embedded={embedded} />
      <PersonalCapabilitySlide2 embedded={embedded} />
      <OrganizationalCapabilitySlide3 embedded={embedded} />
      <GrowthWithoutCapabilityBecomesPressureSlide4 embedded={embedded} />
    </DocumentPageLayout>
  );
}
