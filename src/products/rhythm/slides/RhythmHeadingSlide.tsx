import { Plus } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { PageHeading } from '../../../shared/workspace/PageHeading';
import type { useRhythmPage } from '../hooks/useRhythmPage';

export function RhythmHeadingSlide({
  progress,
  setOpen,
}: Pick<ReturnType<typeof useRhythmPage>, 'progress' | 'setOpen'>) {
  return (
    <>
      <PageHeading
        eyebrow={progress ? 'GROWTH · THE OUTCOME OVER TIME' : 'RHYTHM · RETURN WITH PERSPECTIVE'}
        title={progress ? 'Make your progress visible.' : 'A rhythm, not a one-time event.'}
        description="See what moved, learn from what changed, and bring a clearer view to the next cycle."
      >
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} /> Record a reflection
        </Button>
      </PageHeading>
    </>
  );
}
