import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  OsGovernanceHeroSlide,
  WorkflowApprovalsSlide1,
  AdministrativeControlsSlide2,
  SeparateObservationProgressionAndCommitmentSlide3,
} from './slides';

/** /os/governance — sections in reading order. */
export function OsGovernanceDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<OsGovernanceHeroSlide embedded={embedded} />}
    >
      <WorkflowApprovalsSlide1 embedded={embedded} />
      <AdministrativeControlsSlide2 embedded={embedded} />
      <SeparateObservationProgressionAndCommitmentSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
