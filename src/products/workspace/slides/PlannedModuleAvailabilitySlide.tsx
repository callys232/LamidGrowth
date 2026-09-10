import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Empty } from '../../../shared/ui/Empty';
import type { usePlannedModulePage } from '../hooks/usePlannedModulePage';

export function PlannedModuleAvailabilitySlide({
  location,
}: Pick<ReturnType<typeof usePlannedModulePage>, 'location'>) {
  return (
    <>
      <Empty
        title="Build on the working foundation."
        action={
          <Link className="button button-primary" to="/os">
            Return to your workspace <ArrowRight size={15} />
          </Link>
        }
      >
        You can use objectives, action tracking, guided planning, review, and activity history
        today. Requested surface: {location.pathname}.
      </Empty>
    </>
  );
}
