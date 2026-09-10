import { Plus } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { PageHeading } from '../../../shared/workspace/PageHeading';
import type { useClarityPage } from '../hooks/useClarityPage';

export function ClarityHeadingSlide({
  newObjective,
}: Pick<ReturnType<typeof useClarityPage>, 'newObjective'>) {
  return (
    <>
      <PageHeading
        eyebrow="CLARITY · UNDERSTAND WHAT MATTERS"
        title="Give your ambition a direction."
        description="Bring objectives, context, and the conditions for success into one view."
      >
        <Button onClick={newObjective}>
          <Plus size={16} /> New objective
        </Button>
      </PageHeading>
    </>
  );
}
