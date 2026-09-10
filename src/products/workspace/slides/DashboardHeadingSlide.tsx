import { Plus } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { PageHeading } from '../../../shared/workspace/PageHeading';
import type { useDashboardPage } from '../hooks/useDashboardPage';

export function DashboardHeadingSlide({
  state,
  newObjective,
}: Pick<ReturnType<typeof useDashboardPage>, 'state' | 'newObjective'>) {
  return (
    <>
      <PageHeading
        eyebrow={new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' })
          .format(new Date())
          .toUpperCase()}
        title={`A little clearer, ${state.user.name.split(' ')[0]}.`}
        description="Here’s where things stand. Let’s make the next step count."
      >
        <Button onClick={newObjective}>
          <Plus size={16} /> New objective
        </Button>
      </PageHeading>
    </>
  );
}
