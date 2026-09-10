import { ArrowUpRight, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../../shared/ui/Button';
import { Empty } from '../../../shared/ui/Empty';
import { ObjectiveCard } from '../../clarity/components/ObjectiveCard';
import type { useDashboardPage } from '../hooks/useDashboardPage';

export function DashboardObjectivesSlide({
  active,
  newObjective,
}: Pick<ReturnType<typeof useDashboardPage>, 'active' | 'newObjective'>) {
  return (
    <>
      <section className="dashboard-section">
        <div className="panel-heading">
          <div>
            <h2>Your focus</h2>
            <span>The outcomes behind your work.</span>
          </div>
          <Link to="/os/clarity">
            All objectives <ArrowUpRight size={15} />
          </Link>
        </div>
        {active.length ? (
          <div className="objective-grid">
            {active.slice(0, 3).map((o) => (
              <ObjectiveCard key={o.id} objective={o} />
            ))}
          </div>
        ) : (
          <Empty
            title="What matters to you right now?"
            action={
              <Button onClick={newObjective}>
                <Plus size={15} /> Create your first objective
              </Button>
            }
          >
            Start with one meaningful outcome. The rest can take shape around it.
          </Empty>
        )}
      </section>
    </>
  );
}
