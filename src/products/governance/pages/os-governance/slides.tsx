import { DocumentHeroSlide } from '../../../../shared/content/slides/DocumentHeroSlide';
import { DocumentSectionSlide } from '../../../../shared/content/slides/DocumentSectionSlide';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';

export function OsGovernanceHeroSlide({ embedded = false }: DocumentPageProps) {
  return <DocumentHeroSlide page={content} embedded={embedded} />;
}

/** Workflow Approvals */
export function WorkflowApprovalsSlide1({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[0]}
      index={0}
      last={false}
      embedded={embedded}
    />
  );
}

/** Administrative Controls */
export function AdministrativeControlsSlide2({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[1]}
      index={1}
      last={false}
      embedded={embedded}
    />
  );
}

/** Separate Observation, Progression, and Commitment */
export function SeparateObservationProgressionAndCommitmentSlide3({
  embedded = false,
}: DocumentPageProps) {
  return (
    <DocumentSectionSlide section={content.sections[2]} index={2} last={true} embedded={embedded} />
  );
}
