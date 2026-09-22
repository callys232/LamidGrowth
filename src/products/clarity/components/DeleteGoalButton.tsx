import { useState } from 'react';
import { api } from '../../../api';
import type { Objective } from '../../../types';
import { Button } from '../../../shared/ui/Button';
import { useWorkspace } from '../../workspace/components/WorkspaceShell';

export function DeleteGoalButton({
  objective,
  onDeleted,
}: {
  objective: Objective;
  onDeleted?: () => void;
}) {
  const { state, refresh, notify } = useWorkspace();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deleted, setDeleted] = useState(false);
  if (!state.permissions.includes('work:write')) return null;
  async function remove() {
    setBusy(true);
    setError('');
    try {
      await api(
        `/objectives/${objective.id}`,
        { version: objective.version, confirm: true },
        'DELETE',
      );
      notify('Goal and linked actions deleted. History is retained.');
      setDeleted(true);
      try {
        await refresh();
        onDeleted?.();
      } catch {
        setError('The goal was deleted. Reload to refresh your workspace.');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="goal-delete">
      {deleted ? (
        <p role="status">Goal deleted.</p>
      ) : !confirming ? (
        <Button variant="ghost" onClick={() => setConfirming(true)}>
          Delete goal
        </Button>
      ) : (
        <div role="group" aria-label="Confirm goal deletion">
          <p>
            Delete “{objective.title}” and its{' '}
            {state.actions.filter((action) => action.objectiveId === objective.id).length} linked
            actions from your workspace? History is retained. Unfinished workflows must be cancelled
            first.
          </p>
          <Button variant="secondary" disabled={busy} onClick={() => setConfirming(false)}>
            Keep goal
          </Button>
          <Button disabled={busy} onClick={() => void remove()}>
            {busy ? 'Deleting…' : 'Confirm delete goal'}
          </Button>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
