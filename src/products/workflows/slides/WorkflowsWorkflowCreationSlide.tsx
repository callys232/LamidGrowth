import { Button } from '../../../shared/ui/Button';
import { Field } from '../../../shared/ui/Field';
import type { useWorkflowsPage } from '../hooks/useWorkflowsPage';

export function WorkflowsWorkflowCreationSlide({
  error,
  canManage,
  state,
  create,
  busy,
}: Pick<ReturnType<typeof useWorkflowsPage>, 'error' | 'canManage' | 'state' | 'create' | 'busy'>) {
  return (
    <>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {canManage && state.objectives.some((o) => o.status !== 'Complete') && (
        <details className="panel settings-card">
          <summary>Create a workflow</summary>
          <form onSubmit={create}>
            <Field label="Workflow name">
              <input name="title" required maxLength={500} />
            </Field>
            <Field label="Connected objective">
              <select name="objectiveId">
                {state.objectives
                  .filter((o) => o.status !== 'Complete')
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Next action to prepare (optional)">
              <input name="nextAction" maxLength={500} />
            </Field>
            <Field label="Review reminder">
              <input
                name="reminder"
                required
                maxLength={500}
                defaultValue="Review the outcome and decide what comes next."
              />
            </Field>
            <Field label="Scheduled start (optional)">
              <input name="startAt" type="datetime-local" />
            </Field>
            <Field label="Authorization expires after">
              <select name="days">
                <option value="1">1 day</option>
                <option value="7">7 days</option>
                <option value="30">30 days</option>
              </select>
            </Field>
            <p>
              The sequence reviews recorded context and requirements, optionally prepares an action,
              records a progress snapshot, and creates a reminder. Context reviews use your recorded
              inputs.
            </p>
            <Button type="submit" disabled={busy}>
              Save workflow draft
            </Button>
          </form>
        </details>
      )}
    </>
  );
}
