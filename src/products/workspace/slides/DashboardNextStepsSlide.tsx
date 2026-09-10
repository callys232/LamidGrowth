import { ArrowRight, CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Eyebrow } from '../../../shared/ui/Eyebrow';
import { NextActionsPanel } from '../components/NextActionsPanel';
import type { useDashboardPage } from '../hooks/useDashboardPage';

export function DashboardNextStepsSlide({
  newAction,
  next,
}: Pick<ReturnType<typeof useDashboardPage>, 'newAction' | 'next'>) {
  return (
    <>
      <div className="dashboard-bottom">
        <NextActionsPanel newAction={newAction} next={next} />
        <section className="rhythm-nudge">
          <div className="rhythm-nudge-icon">
            <CalendarDays size={23} />
          </div>
          <Eyebrow>BUILD YOUR RHYTHM</Eyebrow>
          <h3>
            A moment to reflect.
            <br />
            <em>A better next week.</em>
          </h3>
          <p>
            What moved forward? What did you learn? Carry the useful parts into your next cycle.
          </p>
          <Link to="/os/rhythm">
            Start a reflection <ArrowRight size={16} />
          </Link>
        </section>
      </div>
    </>
  );
}
