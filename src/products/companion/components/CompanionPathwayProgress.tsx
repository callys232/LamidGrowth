import { Link, useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../../workspace/components/WorkspaceShell';
import { DeleteGoalButton } from '../../clarity/components/DeleteGoalButton';

export function CompanionPathwayProgress({ onDeleted }: { onDeleted?: (id: string) => void }) {
  const { state, newAction } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const objective =
    state.objectives.find((item) => item.id === params.get('objective')) ||
    state.objectives.find((item) => item.status === 'Active') ||
    state.objectives[0];
  if (!objective) return null;
  const actions = state.actions
    .filter((item) => item.objectiveId === objective.id)
    .sort(
      (a, b) =>
        (a.pathwayOrder ?? Number.MAX_SAFE_INTEGER) - (b.pathwayOrder ?? Number.MAX_SAFE_INTEGER) ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.id.localeCompare(b.id),
    );
  const done = actions.filter((item) => item.status === 'Done').length;
  const next =
    objective.status === 'Active'
      ? actions.find((item) => item.status === 'In progress') ||
        actions.find((item) => item.status === 'Planned')
      : undefined;
  return (
    <section className="companion-pathway plan-summary" aria-label="Saved goal progress">
      <h2>Continue your pathway</h2>
      <label>
        Saved goal
        <select
          value={objective.id}
          onChange={(e) => setParams({ objective: e.target.value }, { replace: true })}
        >
          {state.objectives.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </label>
      <h3>{objective.title}</h3>
      <p>{objective.description}</p>
      <dl>
        <dt>Success</dt>
        <dd>{objective.success || 'No success measure recorded.'}</dd>
        <dt>Constraints</dt>
        <dd>{objective.constraints || 'No constraints recorded.'}</dd>
      </dl>
      <p>
        Goal: {objective.status}. {done} of {actions.length} actions complete.
      </p>
      {actions.length > 0 && (
        <progress aria-label="Pathway completion" value={done} max={actions.length} />
      )}
      {next && (
        <p>
          <strong>Next to follow:</strong> {next.title}
        </p>
      )}
      {!actions.length && <p>No actions yet. Add a first step to begin following this goal.</p>}
      {actions.length > 0 && done === actions.length && (
        <p>
          All actions are complete. Review the success measure in Clarity before marking the goal
          complete.
        </p>
      )}
      <ol>
        {actions.map((action) => (
          <li key={action.id}>
            <strong>{action.title}</strong> <span className="tag">{action.status}</span>
            {action.notes && <p>{action.notes}</p>}
          </li>
        ))}
      </ol>
      <div className="modal-actions">
        <Link className="button button-primary" to={`/os/consistency?objective=${objective.id}`}>
          Manage pathway actions
        </Link>
        <Link className="button button-secondary" to="/os/clarity">
          Review goal in Clarity
        </Link>
        {objective.status !== 'Complete' && (
          <button className="button button-ghost" onClick={() => newAction(objective.id)}>
            Add a step
          </button>
        )}
      </div>
      <DeleteGoalButton
        key={objective.id}
        objective={objective}
        onDeleted={() => {
          setParams({}, { replace: true });
          onDeleted?.(objective.id);
        }}
      />
    </section>
  );
}
