import { CalendarDays, Plus } from 'lucide-react';
import { dateLabel } from '../../../shared/lib/dateLabel';
import type { Objective } from '../../../types';
import { useWorkspace } from '../../workspace/components/WorkspaceShell';
export function ObjectiveCard({ objective }: { objective: Objective }) {
  const { state, newAction } = useWorkspace();
  const actions = state.actions.filter((a) => a.objectiveId === objective.id);
  const done = actions.filter((a) => a.status === 'Done').length;
  const percent = actions.length ? Math.round((done / actions.length) * 100) : 0;
  return (
    <article className="objective-card">
      <div className="objective-card-top">
        <span className={`priority priority-${objective.priority.toLowerCase()}`}>
          {objective.priority} priority
        </span>
        <span>{objective.context}</span>
      </div>
      <h3>{objective.title}</h3>
      <p>{objective.description || 'Add actions to turn this objective into progress.'}</p>
      <div className="objective-progress">
        <span>
          {done} of {actions.length} actions complete
        </span>
        <strong>{percent}%</strong>
      </div>
      <progress
        value={done}
        max={actions.length || 1}
        aria-label={`${objective.title}: ${percent}% complete`}
      />
      <div className="objective-card-bottom">
        <span>
          <CalendarDays size={13} />
          {dateLabel(objective.targetDate)}
        </span>
        <button
          className="text-button"
          disabled={objective.status === 'Complete'}
          onClick={() => newAction(objective.id)}
        >
          Next action <Plus size={14} />
        </button>
      </div>
    </article>
  );
}
