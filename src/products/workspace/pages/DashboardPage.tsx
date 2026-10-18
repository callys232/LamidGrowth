import { Plus } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { PageHeader } from '../../../shared/workspace/ui/PageHeader';
import { useDashboardPage } from '../hooks/useDashboardPage';
import { useOverview } from '../hooks/useOverview';
import { NeedsYouPanel } from '../overview/NeedsYouPanel';
import { DashboardActivitySlide } from '../slides/DashboardActivitySlide';
import { DashboardBriefingSlide } from '../slides/DashboardBriefingSlide';
import { DashboardObjectivesSlide } from '../slides/DashboardObjectivesSlide';
import { NextStepGuide } from '../components/NextStepGuide';

/** The Overview: KPIs across work, money, risk and talent, what needs the user now, then the
 * briefing, objectives and activity. Edit each section in ../overview and ../slides. */
export function Dashboard() {
  const page = useDashboardPage();
  const overview = useOverview();
  return (
    <div className="ws-overview" data-scroll-feedback="off">
      <PageHeader
        eyebrow={new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' })
          .format(new Date())
          .toUpperCase()}
        title={`A little clearer, ${page.state.user.name.split(' ')[0]}.`}
        description="Here’s where things stand. Let’s make the next step count."
        actions={
          <Button onClick={page.newObjective}>
            <Plus size={16} /> New objective
          </Button>
        }
        kpis={overview.kpis}
        loadingKpis={overview.loading ? 6 : 0}
      />
      <NextStepGuide />
      <div className="ws-overview-grid">
        <NeedsYouPanel
          items={overview.queue}
          loading={overview.loading}
          error={overview.error}
          retry={overview.retry}
          newObjective={page.newObjective}
        />
        <div className="ws-overview-briefing">
          <DashboardBriefingSlide />
        </div>
      </div>
      <DashboardObjectivesSlide active={page.active} newObjective={page.newObjective} />
      <DashboardActivitySlide />
    </div>
  );
}
