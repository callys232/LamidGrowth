import { Link } from 'react-router-dom';
import { useWorkspace } from './WorkspaceShell';
import { Button } from '../../../shared/ui/Button';

/** Derive guidance from saved work, never from a dismissed tour or a clicked link. */
export function NextStepGuide() {
  const { state, newObjective, newAction } = useWorkspace();
  const objective = state.objectives.find((item) => item.status === 'Active');
  const actions = state.actions.filter((item) => item.objectiveId === objective?.id);
  const completed = actions.filter((item) => item.status === 'Done').length;
  const awaiting = actions.some((item) => item.status === 'Needs review');
  return (
    <section className="panel settings-card" aria-labelledby="next-step-heading">
      <span className="eyebrow">YOUR NEXT STEP</span>
      <h2 id="next-step-heading">Diagnose one bottleneck. Make a plan you can follow.</h2>
      <p>
        Start with one outcome, describe what is getting in the way, and choose one useful action.
        Review what changed before expanding the plan.
      </p>
      <ol>
        <li>
          <strong>Name the outcome and bottleneck.</strong>{' '}
          {objective
            ? `Current objective: ${objective.title}.`
            : 'Create an objective with a measurable sign of progress and your constraints.'}
        </li>
        <li>
          <strong>Check the evidence.</strong> Use a relevant assessment if it helps answer a
          specific question. Read its inputs, method and limitations before running it.
        </li>
        <li>
          <strong>Take action and review.</strong>{' '}
          {actions.length
            ? `${completed} of ${actions.length} actions completed for this objective.`
            : 'Choose an owner, a due date and the evidence you will review.'}
        </li>
      </ol>
      {!objective ? (
        <Button onClick={newObjective}>Set my first objective</Button>
      ) : !actions.length ? (
        <Button onClick={() => newAction(objective.id)}>Create the first action</Button>
      ) : (
        <Link
          className="button button-primary"
          to={awaiting ? '/os/consistency' : completed ? '/os/rhythm' : '/os/today'}
        >
          {awaiting
            ? 'Review submitted work'
            : completed
              ? 'Review what changed'
              : 'Work on the next action'}
        </Link>
      )}
      <p>
        <Link to="/os/engines">Find an assessment</Link> ·{' '}
        <Link to="/os/pricing">Understand costs before running a tool</Link>
      </p>
      <small>
        {state.user.demo
          ? 'This is sample work. Demo assessments use no real points, and sample activity is separate from your account.'
          : 'You can define your objective and plan before purchasing tool runs. A score is an input to your decision; you decide what to do.'}
      </small>
    </section>
  );
}
