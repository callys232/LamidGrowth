import { CalendarDays, Plus } from 'lucide-react';
import { dateLabel } from '../../../shared/lib/dateLabel';
import type { Objective } from '../../../types';
import { useWorkspace } from '../../workspace/components/WorkspaceShell';
import { ObjectiveForm } from '../../workspace/components/WorkspaceShell';
import { DeleteGoalButton } from './DeleteGoalButton';
import { useState } from 'react';
export function ObjectiveCard({ objective }: { objective: Objective }) {
  const { state, newAction, refresh, notify } = useWorkspace();
  const [editing, setEditing] = useState(false);
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
      {state.permissions.includes('work:write') && (
        <div className="objective-goal-controls">
          <button
            type="button"
            className="text-button"
            onClick={() => setEditing(true)}
            aria-label={`Edit goal: ${objective.title}`}
          >
            Edit goal
          </button>
          <DeleteGoalButton objective={objective} />
        </div>
      )}
      {editing && (
        <ObjectiveForm
          context={objective.context}
          objective={objective}
          onClose={() => setEditing(false)}
          onSaved={async () => {
            setEditing(false);
            notify('Goal updated.');
            await refresh().catch(() => notify('Goal saved. Reload to refresh your workspace.'));
          }}
        />
      )}
    </article>
  );
}
