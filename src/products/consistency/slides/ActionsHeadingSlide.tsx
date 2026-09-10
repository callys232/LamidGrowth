import { Plus } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { PageHeading } from '../../../shared/workspace/PageHeading';
import type { useActionsPage } from '../hooks/useActionsPage';

export function ActionsHeadingSlide({
  today,
  workflows,
  newAction,
}: Pick<ReturnType<typeof useActionsPage>, 'today' | 'workflows' | 'newAction'>) {
  return (
    <>
      <PageHeading
        eyebrow={
          today
            ? 'TODAY · A DELIBERATE NEXT STEP'
            : workflows
              ? 'WORKFLOWS · WORK AROUND THE OUTCOME'
              : 'CONSISTENCY · INTENT INTO ACTION'
        }
        title={
          today
            ? 'Make room for what matters.'
            : workflows
              ? 'See how the work moves.'
              : 'Keep the important work moving.'
        }
        description={
          today
            ? 'Your due actions and anything waiting for your judgment.'
            : 'Clear ownership, connected objectives, and visible review. One action at a time.'
        }
      >
        <Button onClick={() => newAction()}>
          <Plus size={16} /> Add action
        </Button>
      </PageHeading>
    </>
  );
}
