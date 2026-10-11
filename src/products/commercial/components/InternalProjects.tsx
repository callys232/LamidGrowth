import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../../api';
import { Button } from '../../../shared/ui/Button';
import { Field } from '../../../shared/ui/Field';
import { Modal } from '../../../shared/ui/Modal';
import { useWorkspace } from '../../workspace/components/WorkspaceShell';

export type InternalProject = {
  id: string;
  version: number;
  title: string;
  description: string;
  owner: string;
  goalId: string;
  dueDate: string;
  status: 'In progress' | 'Paused' | 'Complete';
  milestones: { id: string; title: string; done: boolean }[];
};
export function InternalProjects() {
  const { state } = useWorkspace();
  const [projects, setProjects] = useState<InternalProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<InternalProject | 'new' | null>(null);
  const [deleting, setDeleting] = useState<InternalProject | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const canWrite = state.permissions.includes('work:write');
  const existing = editing && editing !== 'new' ? editing : null;
  async function load() {
    setProjects(await api<InternalProject[]>('/internal-projects'));
  }
  useEffect(() => {
    void load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  async function mutate(operation: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await operation();
      await load();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const milestones = String(values.milestones)
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean)
      .map(
        (title) =>
          existing?.milestones.find((m) => m.title === title) || {
            id: crypto.randomUUID(),
            title,
            done: false,
          },
      );
    const input = {
      title: String(values.title),
      description: String(values.description),
      goalId: String(values.goalId),
      owner: String(values.owner),
      dueDate: String(values.dueDate),
      status: milestones.every((m) => m.done)
        ? 'Complete'
        : String(values.status) === 'Complete'
          ? 'In progress'
          : String(values.status),
      milestones,
    };
    if (
      await mutate(() =>
        api(
          existing ? `/internal-projects/${existing.id}` : '/internal-projects',
          existing ? { ...input, version: existing.version } : input,
          existing ? 'PATCH' : 'POST',
        ),
      )
    )
      setEditing(null);
  }
  async function toggle(project: InternalProject, milestoneId: string) {
    const milestones = project.milestones.map((m) =>
      m.id === milestoneId ? { ...m, done: !m.done } : m,
    );
    const { id, version, title, description, goalId, owner, dueDate } = project;
    await mutate(() =>
      api(
        `/internal-projects/${id}`,
        {
          version,
          title,
          description,
          goalId,
          owner,
          dueDate,
          milestones,
          status: milestones.every((m) => m.done)
            ? 'Complete'
            : project.status === 'Complete'
              ? 'In progress'
              : project.status,
        },
        'PATCH',
      ),
    );
  }
  return (
    <section className="account-service">
      <div className="panel-heading">
        <div>
          <h3>Internal projects</h3>
          <span>Plan work with goals, owners, and milestones.</span>
        </div>
        {canWrite && <Button onClick={() => setEditing('new')}>Create internal project</Button>}
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {loading && <p role="status">Loading internal projects…</p>}
      {!loading && !projects.length && <p>No internal projects yet.</p>}
      <div className="account-service-grid">
        {projects.map((p) => (
          <article className="settings-card" key={p.id}>
            <h4>{p.title}</h4>
            <p>{p.description}</p>
            <p>
              {p.owner} · {p.status}
              {p.dueDate ? ` · Due ${p.dueDate}` : ''}
            </p>
            <progress
              aria-label={`${p.title} progress`}
              value={p.milestones.filter((m) => m.done).length}
              max={p.milestones.length}
            />
            <ul className="internal-milestones">
              {p.milestones.map((m) => (
                <li key={m.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={m.done}
                      disabled={busy || !canWrite}
                      onChange={() => void toggle(p, m.id)}
                    />
                    {m.title}
                  </label>
                </li>
              ))}
            </ul>
            {canWrite && (
              <div className="account-service-actions">
                <Button variant="secondary" disabled={busy} onClick={() => setEditing(p)}>
                  Edit project
                </Button>
                <Button variant="ghost" disabled={busy} onClick={() => setDeleting(p)}>
                  Delete project
                </Button>
              </div>
            )}
          </article>
        ))}
      </div>
      {editing && (
        <Modal
          title={existing ? 'Edit internal project' : 'Create internal project'}
          onClose={() => !busy && setEditing(null)}
        >
          <form className="form-grid internal-project-form" onSubmit={save}>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <Field label="Project title">
              <input name="title" required maxLength={200} defaultValue={existing?.title || ''} />
            </Field>
            <Field label="Description">
              <textarea
                name="description"
                maxLength={4000}
                defaultValue={existing?.description || ''}
              />
            </Field>
            <Field label="Linked goal">
              <select name="goalId" defaultValue={existing?.goalId || ''}>
                <option value="">No linked goal</option>
                {state.objectives.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Owner">
              <input
                name="owner"
                required
                maxLength={100}
                defaultValue={existing?.owner || state.user.name}
              />
            </Field>
            <Field label="Due date">
              <input name="dueDate" type="date" defaultValue={existing?.dueDate || ''} />
            </Field>
            <Field label="Status">
              <select name="status" defaultValue={existing?.status || 'In progress'}>
                <option>In progress</option>
                <option>Paused</option>
                <option>Complete</option>
              </select>
            </Field>
            <Field
              label="Milestones"
              hint="One per line. Completion is tracked on the project card."
            >
              <textarea
                name="milestones"
                required
                rows={4}
                defaultValue={existing?.milestones.map((m) => m.title).join('\n') || ''}
              />
            </Field>
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save project'}
            </Button>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal title="Delete internal project?" onClose={() => !busy && setDeleting(null)}>
          <p>Remove {deleting.title} from your project list. The linked goal remains.</p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <Button
            disabled={busy}
            onClick={() =>
              void mutate(() =>
                api(`/internal-projects/${deleting.id}`, { version: deleting.version }, 'DELETE'),
              ).then((saved) => {
                if (saved) setDeleting(null);
              })
            }
          >
            Delete project
          </Button>
        </Modal>
      )}
    </section>
  );
}
