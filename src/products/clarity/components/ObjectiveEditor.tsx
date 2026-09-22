import type { FormEvent } from 'react';
import { useState } from 'react';
import { api, ApiError } from '../../../api';
import { Button } from '../../../shared/ui/Button';
import { DatePicker } from '../../../shared/ui/DatePicker';
import { Field } from '../../../shared/ui/Field';
import { Modal } from '../../../shared/ui/Modal';
import type { Objective } from '../../../types';
import { useWorkspace } from '../../workspace/components/WorkspaceShell';
import { DeleteGoalButton } from './DeleteGoalButton';
export function ObjectiveEditor({
  objective,
  onClose,
}: {
  objective: Objective;
  onClose: () => void;
}) {
  const { refresh, notify } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState(objective);
  const [conflict, setConflict] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api(`/objectives/${objective.id}`, { ...data, version: draft.version }, 'PATCH');
      await refresh();
      notify('Objective updated. Your context carries forward.');
      onClose();
    } catch (error) {
      setError((error as Error).message);
      if (error instanceof ApiError && error.status === 409) {
        setConflict(true);
        await refresh().catch(() => {});
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Keep your objective in context." onClose={onClose}>
      <form key={draft.version} onSubmit={save}>
        <Field label="Objective">
          <input name="title" defaultValue={draft.title} required maxLength={500} />
        </Field>
        <Field label="The situation">
          <textarea name="description" defaultValue={draft.description} rows={3} maxLength={5000} />
        </Field>
        <Field label="Success criteria">
          <textarea name="success" defaultValue={draft.success} rows={2} maxLength={5000} />
        </Field>
        <Field label="Constraints and assumptions">
          <textarea name="constraints" defaultValue={draft.constraints} rows={2} maxLength={5000} />
        </Field>
        <div className="form-grid">
          <Field label="Priority">
            <select name="priority" defaultValue={draft.priority}>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </Field>
          <Field label="Status">
            <select name="status" defaultValue={draft.status}>
              <option>Active</option>
              <option>Paused</option>
              <option>Complete</option>
            </select>
          </Field>
        </div>
        <Field label="Target date">
          <DatePicker name="targetDate" defaultValue={draft.targetDate} />
        </Field>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="modal-actions">
          {conflict && (
            <Button
              variant="secondary"
              onClick={() => {
                setDraft(objective);
                setConflict(false);
                setError('');
              }}
            >
              Discard edits and load latest
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save objective'}
          </Button>
        </div>
      </form>
      <DeleteGoalButton objective={objective} onDeleted={onClose} />
    </Modal>
  );
}
