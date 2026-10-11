import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../../api';
import { Button } from '../../../shared/ui/Button';
import { Field } from '../../../shared/ui/Field';
import { Modal } from '../../../shared/ui/Modal';
import { useWorkspace } from '../../workspace/components/WorkspaceShell';
type Request = {
  id: string;
  userId: string;
  name: string;
  email: string;
  reason: string;
  status: string;
  version: number;
};
export function DeletionRequests() {
  const { state } = useWorkspace();
  const [requests, setRequests] = useState<Request[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<Request | null>(null);
  async function load() {
    setRequests(await api<Request[]>('/admin/deletion-requests'));
  }
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, []);
  async function review(event: FormEvent<HTMLFormElement>, request: Request) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setError('');
    try {
      await api(`/admin/deletion-requests/${request.id}`, { ...body, version: request.version });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!removing) return;
    const body = Object.fromEntries(new FormData(event.currentTarget));
    if (!body.mfaCode) delete body.mfaCode;
    setBusy(true);
    setError('');
    try {
      await api(`/admin/users/${removing.userId}`, body, 'DELETE');
      if (removing.userId === state.user.id) {
        window.location.assign('/login');
        return;
      }
      setRemoving(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel account-service">
      <h3>Account deletion requests</h3>
      <p>
        Review obligations and shared records before using the existing administrator
        account-removal process.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!requests.length && <p>No deletion requests.</p>}
      <ul className="consultant-match-list">
        {requests.map((r) => (
          <li key={r.id}>
            <strong>
              {r.name} · {r.email}
            </strong>
            <p>{r.reason || 'No reason supplied'}</p>
            <p>{r.status.replaceAll('_', ' ')}</p>
            <form className="form-grid" onSubmit={(e) => review(e, r)}>
              <Field label="Review status">
                <select
                  name="status"
                  defaultValue={r.status === 'declined' ? 'declined' : 'under_review'}
                >
                  <option value="under_review">Under review</option>
                  <option value="declined">Declined</option>
                </select>
              </Field>
              <Field label="Review note">
                <textarea name="note" required maxLength={2000} />
              </Field>
              <Button type="submit" disabled={busy}>
                Save review
              </Button>
            </form>
            {r.status === 'under_review' && (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  setError('');
                  setRemoving(r);
                }}
              >
                Remove reviewed account
              </Button>
            )}
          </li>
        ))}
      </ul>
      {removing && (
        <Modal
          title="Permanently remove reviewed account?"
          onClose={() => !busy && setRemoving(null)}
        >
          <p>
            This removes {removing.name} ({removing.email}) and their removable account data. Review
            shared work and financial obligations before continuing.
          </p>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <form className="form-grid" onSubmit={remove}>
            <Field label="Confirmation" hint="Type DELETE USER ACCOUNT">
              <input name="confirmation" required pattern="DELETE USER ACCOUNT" />
            </Field>
            <Field label="Your administrator password">
              <input name="password" type="password" autoComplete="current-password" required />
            </Field>
            <Field
              label="Authentication code"
              hint="Required if your account has two-factor authentication."
            >
              <input name="mfaCode" autoComplete="one-time-code" maxLength={64} />
            </Field>
            <Button type="submit" disabled={busy}>
              Permanently remove account
            </Button>
          </form>
        </Modal>
      )}
    </section>
  );
}
