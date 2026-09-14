import { Link } from 'react-router-dom';
import { Button } from '../../../shared/ui/Button';
import { PageHeading } from '../../../shared/workspace/PageHeading';
import type { useCommercialPage } from '../hooks/useCommercialPage';

export function CommercialHeadingSlide({
  setCreating,
  options,
}: Pick<ReturnType<typeof useCommercialPage>, 'setCreating' | 'options'>) {
  return (
    <>
      <PageHeading
        eyebrow="COMMERCIAL WORK"
        title="From a clear brief to a proposal"
        description="Post scoped work, compare bids, and prepare proposal drafts."
      >
        <Button onClick={() => setCreating(true)} disabled={!options}>
          Post a job
        </Button>
        <Link className="button button-secondary" to="/os/commercial/projects">
          View projects &amp; milestones
        </Link>
      </PageHeading>
    </>
  );
}
