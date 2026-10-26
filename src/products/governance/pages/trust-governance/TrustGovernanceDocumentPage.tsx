import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { InfoPage, info } from '../../../website/pages/info/InfoPage';
import {
  TrustGovernanceHeroSlide,
  ExperienceGovernanceSlide1,
  OrganizationalGovernanceSlide2,
  ContinuousIntelligenceGovernanceSlide3,
  ConnectedGovernanceClearResponsibilitiesSlide4,
} from './slides';

/** /trust/governance — sections in reading order. */
export function TrustGovernanceDocumentPage({ embedded = false }: DocumentPageProps) {
  if (!embedded) return <InfoPage content={info.governance} />;
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<TrustGovernanceHeroSlide embedded={embedded} />}
    >
      <ExperienceGovernanceSlide1 embedded={embedded} />
      <OrganizationalGovernanceSlide2 embedded={embedded} />
      <ContinuousIntelligenceGovernanceSlide3 embedded={embedded} />
      <ConnectedGovernanceClearResponsibilitiesSlide4 embedded={embedded} />
    </DocumentPageLayout>
  );
}
