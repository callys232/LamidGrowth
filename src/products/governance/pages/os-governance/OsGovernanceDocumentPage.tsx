import { Link } from 'react-router-dom';
import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  OsGovernanceHeroSlide,
  WorkflowApprovalsSlide1,
  AdministrativeControlsSlide2,
  SeparateObservationProgressionAndCommitmentSlide3,
} from './slides';

/** /os/governance — sections in reading order. The "Getting started" reference panel these
 * sections render into (see CanonicalCopy, embedded=true) is otherwise pure static copy with no
 * links anywhere on the site — but these two describe real, reachable features, so they're made
 * real navigation here rather than left looking clickable and doing nothing. "Separate
 * Observation, Progression, and Commitment" describes a hardcoded architectural guarantee
 * (the A1/A2/A3 authority bands in agents.mjs), not a configurable setting, so it stays plain. */
export function OsGovernanceDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<OsGovernanceHeroSlide embedded={embedded} />}
    >
      {embedded ? (
        <Link className="section-reference-link" to="/os/governance#pending-approvals">
          <WorkflowApprovalsSlide1 embedded={embedded} />
        </Link>
      ) : (
        <WorkflowApprovalsSlide1 embedded={embedded} />
      )}
      {embedded ? (
        <Link className="section-reference-link" to="/os/settings">
          <AdministrativeControlsSlide2 embedded={embedded} />
        </Link>
      ) : (
        <AdministrativeControlsSlide2 embedded={embedded} />
      )}
      <SeparateObservationProgressionAndCommitmentSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
