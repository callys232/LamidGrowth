import { Button } from '../../../shared/ui/Button';
import { Empty } from '../../../shared/ui/Empty';
import { StatusPill } from '../../../shared/workspace/StatusPill';
import type { useWorkflowsPage } from '../hooks/useWorkflowsPage';
import { labels } from '../types';

export function WorkflowsWorkflowRunsSlide({
  runs,
  state,
  canManage,
  busy,
  command,
  remove,
}: Pick<
  ReturnType<typeof useWorkflowsPage>,
  'runs' | 'state' | 'canManage' | 'busy' | 'command' | 'remove'
>) {
  return (
    <>
      {!runs.length && (
        <Empty title="No workflows yet">
          Create an objective, then schedule its next operating cycle.
        </Empty>
      )}
      {runs.map((run) => (
        <section className="panel settings-card" key={run.id}>
          <h2>{run.title}</h2>
          <StatusPill status={run.state.replaceAll('_', ' ')} />
          <p>{state.objectives.find((o) => o.id === run.objective_id)?.title}</p>
          <details>
            <summary>Review current objective context</summary>
            <p>{state.objectives.find((o) => o.id === run.objective_id)?.description}</p>
            <p>
              Success:{' '}
              {state.objectives.find((o) => o.id === run.objective_id)?.success || 'Not recorded'}
            </p>
            <p>
              Constraints:{' '}
              {state.objectives.find((o) => o.id === run.objective_id)?.constraints ||
                'Not recorded'}
            </p>
          </details>
          <p>
            Starts {new Date(run.start_at).toLocaleString()} · Expires{' '}
            {new Date(run.expires_at).toLocaleString()}
          </p>
          {run.reason && <p role="status">{run.reason}</p>}
          <ol>
            {run.steps.map((step) => (
              <li key={step.id}>
                <strong>{labels[step.toolId] || step.toolId}</strong> · {step.state}
                {step.input.title && <p>Action: {step.input.title}</p>}
                {step.input.notes && <p>{step.input.notes}</p>}
                {step.input.message && <p>Reminder: {step.input.message}</p>}
                {step.output && (
                  <p>
                    Recorded {new Date(step.output.observedAt).toLocaleString()}
                    {step.output.result.total !== undefined &&
                      ` · ${step.output.result.completed} of ${step.output.result.total} actions complete`}
                    {step.output.result.action && ` · Created “${step.output.result.action.title}”`}
                  </p>
                )}
              </li>
            ))}
          </ol>
          {canManage && (
            <div className="modal-actions">
              {run.state === 'draft' && (
                <Button disabled={busy} onClick={() => void command(run, 'start')}>
                  Start workflow
                </Button>
              )}
              {run.state === 'needs_approval' && (
                <Button disabled={busy} onClick={() => void command(run, 'approve')}>
                  Approve next step
                </Button>
              )}
              {['running', 'needs_approval'].includes(run.state) && (
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void command(run, 'pause')}
                >
                  Pause workflow
                </Button>
              )}
              {run.state === 'paused' && (
                <Button disabled={busy} onClick={() => void command(run, 'resume')}>
                  Resume workflow
                </Button>
              )}
              {run.state === 'failed' && (
                <Button disabled={busy} onClick={() => void command(run, 'retry')}>
                  Retry failed step
                </Button>
              )}
              {!['completed', 'cancelled', 'expired'].includes(run.state) && (
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void command(run, 'cancel')}
                >
                  Cancel workflow
                </Button>
              )}
              {['completed', 'cancelled', 'expired'].includes(run.state) && (
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm('Delete this workflow? This cannot be undone.'))
                      void remove(run);
                  }}
                >
                  Delete workflow
                </Button>
              )}
            </div>
          )}
        </section>
      ))}
    </>
  );
}
