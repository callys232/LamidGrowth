import { ArrowRight, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Empty } from '../../../shared/ui/Empty';
import { ActionRow } from '../../consistency/components/ActionRow';
import type { useDashboardPage } from '../hooks/useDashboardPage';
export function NextActionsPanel({
  newAction,
  next,
}: Pick<ReturnType<typeof useDashboardPage>, 'newAction' | 'next'>) {
  return (
    <>
      <section className="panel next-actions">
        <div className="panel-heading">
          <div>
            <h2>Make your next move</h2>
            <span>Small steps. Connected to the bigger picture.</span>
          </div>
          <button className="icon-button" aria-label="Add action" onClick={() => newAction()}>
            <Plus size={19} />
          </button>
        </div>
        {next.length ? (
          next.slice(0, 4).map((a) => <ActionRow key={a.id} action={a} />)
        ) : (
          <Empty title="A little room to begin">Add an action to move an objective forward.</Empty>
        )}
        <Link className="panel-bottom-link" to="/os/consistency">
          See all your actions <ArrowRight size={15} />
        </Link>
      </section>
    </>
  );
}
