import { CalendarDays, Plus, ShieldCheck } from 'lucide-react';
import { dateLabel } from '../../../shared/lib/dateLabel';
import { Button } from '../../../shared/ui/Button';
import { Empty } from '../../../shared/ui/Empty';
import { StatusPill } from '../../../shared/workspace/StatusPill';
import { ActionRow } from '../components/ActionRow';
import type { useActionsPage } from '../hooks/useActionsPage';

export function ActionsActionListSlide({
  actions,
  today,
  newAction,
  view,
  statuses,
  filter,
  setSelected,
  state,
}: Pick<
  ReturnType<typeof useActionsPage>,
  'actions' | 'today' | 'newAction' | 'view' | 'statuses' | 'filter' | 'setSelected' | 'state'
>) {
  return (
    <>
      {actions.length === 0 ? (
        <Empty
          title={today ? 'A little breathing room.' : 'Your next move starts here.'}
          action={
            <Button variant="secondary" onClick={() => newAction()}>
              Add an action <Plus size={15} />
            </Button>
          }
        >
          {today
            ? 'No actions are due or waiting for review. You can plan your next step.'
            : 'No actions match this view. Add a step or change the status filter.'}
        </Empty>
      ) : view === 'list' ? (
        <section className="panel action-list">
          {actions.map((a) => (
            <ActionRow action={a} key={a.id} />
          ))}
        </section>
      ) : (
        <div className="kanban">
          {statuses
            .filter((status) => filter === 'All' || status === filter)
            .map((status) => (
              <section className="kanban-column" key={status}>
                <div className="kanban-heading">
                  <StatusPill status={status} />
                  <span>{actions.filter((a) => a.status === status).length}</span>
                </div>
                {actions
                  .filter((a) => a.status === status)
                  .map((action) => (
                    <button
                      className="kanban-card"
                      key={action.id}
                      onClick={() => setSelected(action.id)}
                    >
                      <small>
                        {state.objectives.find((o) => o.id === action.objectiveId)?.title}
                      </small>
                      <h3>{action.title}</h3>
                      <p>{action.notes || 'Open to review this action.'}</p>
                      <div>
                        <span>
                          <CalendarDays size={12} />
                          {dateLabel(action.dueDate)}
                        </span>
                        {action.requiresApproval && <ShieldCheck size={14} />}
                        <span className="avatar avatar-tiny">{action.owner[0]}</span>
                      </div>
                    </button>
                  ))}
                {!actions.some((a) => a.status === status) && (
                  <p className="kanban-empty">Room for what comes next.</p>
                )}
              </section>
            ))}
        </div>
      )}
    </>
  );
}
