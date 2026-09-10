import { useDashboardPage } from '../hooks/useDashboardPage';
import { DashboardFocusSlide } from '../slides/DashboardFocusSlide';
import { DashboardHeadingSlide } from '../slides/DashboardHeadingSlide';
import { DashboardNextStepsSlide } from '../slides/DashboardNextStepsSlide';
import { DashboardObjectivesSlide } from '../slides/DashboardObjectivesSlide';
import { DashboardStatisticsSlide } from '../slides/DashboardStatisticsSlide';

/** Compose the page in reading order. Edit each section in ../slides. */
export function Dashboard() {
  const page = useDashboardPage();
  return (
    <>
      <DashboardHeadingSlide state={page.state} newObjective={page.newObjective} />
      <DashboardFocusSlide active={page.active} pending={page.pending} />
      <DashboardStatisticsSlide active={page.active} state={page.state} done={page.done} />
      <DashboardObjectivesSlide active={page.active} newObjective={page.newObjective} />
      <DashboardNextStepsSlide newAction={page.newAction} next={page.next} />
    </>
  );
}
