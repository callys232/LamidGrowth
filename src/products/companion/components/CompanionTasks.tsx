import { useEffect, useState } from 'react';
import { api } from '../../../api';

type Task = {
  id: string;
  cursor?: string;
  version: number;
  message: string;
  status: string;
  estimatedPoints: number;
  steps: Array<{
    name: string;
    points: number;
    status: string;
    error?: string;
    result?: { response: string };
  }>;
};
export function CompanionTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  async function refresh(before?: string) {
    const rows = await api<Task[]>(
      `/companion/tasks?limit=25${before ? `&before=${encodeURIComponent(before)}` : ''}`,
    );
    setTasks((previous) => (before ? [...previous, ...rows] : rows));
    setHasMore(rows.length === 25);
  }
  async function cancel(task: Task) {
    setBusy(true);
    setError('');
    try {
      await api(`/companion/tasks/${task.id}/cancel`, { version: task.version });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, []);
  async function act(task?: Task) {
    setBusy(true);
    setError('');
    try {
      if (task) await api(`/companion/tasks/${task.id}/next`, { version: task.version, consent });
      else {
        await api('/companion/tasks', { message });
        setMessage('');
      }
      await refresh();
    } catch (e) {
      setError((e as Error).message);
      await refresh().catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="companion-task-panel">
      <summary>Coordinate a task across specialists</summary>
      <p>
        Describe the outcome. Review the specialist sequence for free, then approve each paid step.
        Results are proposals; they do not automatically change your project.
      </p>
      <form
        className="companion-task-form"
        onSubmit={(e) => {
          e.preventDefault();
          void act();
        }}
      >
        <label>
          Task description
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            minLength={5}
            maxLength={1200}
            required
          />
        </label>
        <button disabled={busy}>Preview specialist plan</button>
      </form>
      <label className="companion-task-consent">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />{' '}
        Allow external AI to use authorized workspace context for the next step.
      </label>
      {error && <p role="alert">{error}</p>}
      {tasks.map((task) => {
        const next = task.steps.find((s) => s.status !== 'completed');
        return (
          <article key={task.id} className="companion-task-card">
            <h3>{task.message}</h3>
            <p className="companion-task-status">
              {task.status.replaceAll('_', ' ')} · estimated total {task.estimatedPoints} points
            </p>
            <ol className="companion-task-steps">
              {task.steps.map((step, index) => (
                <li key={index}>
                  <div className="companion-task-step-head">
                    <strong>{step.name}</strong>
                    <span className={`companion-task-chip companion-task-chip-${step.status}`}>
                      {step.status}
                    </span>
                    <span className="companion-task-step-points">{step.points} points</span>
                  </div>
                  {step.result && <p>{step.result.response}</p>}
                  {step.error && step.status !== 'completed' && <p role="alert">{step.error}</p>}
                </li>
              ))}
            </ol>
            {next && task.status !== 'cancelled' && (
              <button disabled={busy} onClick={() => void act(task)}>
                {next.status === 'running'
                  ? 'Refresh or resume step'
                  : `Approve ${next.name} · ${next.points} points`}
              </button>
            )}
            {['awaiting_approval', 'failed'].includes(task.status) && (
              <button disabled={busy} onClick={() => void cancel(task)}>
                Cancel remaining steps
              </button>
            )}
            {task.status === 'failed' && (
              <p>Approving again starts a new attempt. Earlier completed steps remain saved.</p>
            )}
            {!next && (
              <p>
                Specialist review complete.{' '}
                <a href="/os/companion">
                  Review and save your goal and next action in Guided Planning.
                </a>
              </p>
            )}
          </article>
        );
      })}
      {hasMore && (
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await refresh(tasks.at(-1)?.cursor);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Load older tasks
        </button>
      )}
    </details>
  );
}
