import { useState, type FormEvent } from 'react';
import { Button } from '../../../shared/ui/Button';
import { Field } from '../../../shared/ui/Field';
import { Modal } from '../../../shared/ui/Modal';
import type { DemoProject, DemoWorkspace } from './scenarios';

export function DemoProjects({
  state,
  change,
}: {
  state: DemoWorkspace;
  change: (update: (sample: DemoWorkspace) => DemoWorkspace, message: string) => void;
}) {
  const [editing, setEditing] = useState<DemoProject | 'new' | null>(null);
  const [deleting, setDeleting] = useState<DemoProject | null>(null);
  const existing = editing && editing !== 'new' ? editing : null;
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const titles = String(data.milestones)
      .split('\n')
      .map((title) => title.trim())
      .filter(Boolean);
    if (!String(data.title).trim() || !titles.length) return;
    const milestones = titles.map(
      (title) =>
        existing?.milestones.find((m) => m.title === title) ?? {
          id: crypto.randomUUID(),
          title,
          done: false,
        },
    );
    const project: DemoProject = {
      id: existing?.id ?? crypto.randomUUID(),
      title: String(data.title).trim(),
      description: String(data.description),
      goalId: String(data.goalId),
      owner: String(data.owner).trim(),
      dueDate: String(data.dueDate),
      status: milestones.every((m) => m.done)
        ? 'Complete'
        : String(data.status) === 'Complete'
          ? 'In progress'
          : (data.status as DemoProject['status']),
      milestones,
    };
    change(
      (s) => ({
        ...s,
        projects: existing
          ? s.projects.map((p) => (p.id === existing.id ? project : p))
          : [...s.projects, project],
      }),
      existing ? 'Sample project updated.' : 'Sample project created.',
    );
    setEditing(null);
  }
  return (
    <section>
      <div className="marketing-demo-heading">
        <div>
          <h2>Projects</h2>
          <p>Turn a goal into a delivery plan with an owner and measurable milestones.</p>
        </div>
        <Button onClick={() => setEditing('new')}>Create project</Button>
      </div>
      <div className="marketing-demo-grid">
        {state.projects.map((project) => {
          const complete = project.milestones.filter((m) => m.done).length;
          const percent = project.milestones.length
            ? Math.round((complete / project.milestones.length) * 100)
            : 0;
          return (
            <article key={project.id} className="marketing-demo-panel demo-project-card">
              <span>{project.status}</span>
              <h3>{project.title}</h3>
              <p>{project.description}</p>
              <p>
                <strong>Goal:</strong>{' '}
                {state.objectives.find((g) => g.id === project.goalId)?.title ?? 'No linked goal'}
              </p>
              <p>
                <strong>Owner:</strong> {project.owner}
              </p>
              <p>
                <strong>Due:</strong> {project.dueDate || 'No date set'}
              </p>
              <div className="demo-project-progress">
                <strong>{percent}%</strong>
                <span>
                  {complete} of {project.milestones.length} milestones complete
                </span>
              </div>
              <progress
                value={complete}
                max={project.milestones.length || 1}
                aria-label={`${project.title}: ${percent}% complete`}
              />
              <ul className="demo-project-milestones">
                {project.milestones.map((milestone) => (
                  <li key={milestone.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={milestone.done}
                        onChange={(e) => {
                          const done = e.target.checked;
                          change(
                            (s) => ({
                              ...s,
                              projects: s.projects.map((p) => {
                                if (p.id !== project.id) return p;
                                const milestones = p.milestones.map((m) =>
                                  m.id === milestone.id ? { ...m, done } : m,
                                );
                                return {
                                  ...p,
                                  milestones,
                                  status: milestones.every((m) => m.done)
                                    ? 'Complete'
                                    : p.status === 'Paused'
                                      ? 'Paused'
                                      : 'In progress',
                                };
                              }),
                            }),
                            'Sample project milestone updated.',
                          );
                        }}
                      />
                      {milestone.title}
                    </label>
                  </li>
                ))}
              </ul>
              <div className="marketing-demo-actions">
                <Button variant="secondary" onClick={() => setEditing(project)}>
                  Edit project
                </Button>
                <Button variant="ghost" onClick={() => setDeleting(project)}>
                  Delete project
                </Button>
              </div>
            </article>
          );
        })}
      </div>
      {!state.projects.length && <p>No sample projects yet. Create one to plan delivery.</p>}
      {editing && (
        <Modal
          title={existing ? 'Edit sample project' : 'Create sample project'}
          onClose={() => setEditing(null)}
        >
          <form onSubmit={save}>
            <Field label="Project title">
              <input
                name="title"
                required
                pattern=".*\S.*"
                maxLength={500}
                defaultValue={existing?.title}
              />
            </Field>
            <Field label="Scope and expected outcome">
              <textarea name="description" maxLength={5000} defaultValue={existing?.description} />
            </Field>
            <Field label="Linked goal">
              <select name="goalId" defaultValue={existing?.goalId ?? ''}>
                <option value="">No linked goal</option>
                {state.objectives.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Project owner">
              <input
                name="owner"
                required
                pattern=".*\S.*"
                maxLength={200}
                defaultValue={existing?.owner ?? 'Alex Morgan (sample)'}
              />
            </Field>
            <Field label="Target date">
              <input name="dueDate" type="date" defaultValue={existing?.dueDate} />
            </Field>
            <Field
              label="Project status"
              hint="A project completes when all its milestones are complete."
            >
              <select name="status" defaultValue={existing?.status ?? 'Planned'}>
                <option>Planned</option>
                <option>In progress</option>
                <option>Paused</option>
                {existing?.status === 'Complete' && <option>Complete</option>}
              </select>
            </Field>
            <Field
              label="Milestones"
              hint="Enter one milestone per line. Keep its wording to retain completion progress."
            >
              <textarea
                name="milestones"
                rows={4}
                required
                maxLength={5000}
                defaultValue={existing?.milestones.map((m) => m.title).join('\n')}
              />
            </Field>
            <div className="modal-actions">
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit">Save project</Button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal title="Delete sample project?" onClose={() => setDeleting(null)}>
          <p>
            Delete “{deleting.title}” and its milestones? The linked goal and actions will remain.
          </p>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Keep project
            </Button>
            <Button
              onClick={() => {
                change(
                  (s) => ({ ...s, projects: s.projects.filter((p) => p.id !== deleting.id) }),
                  'Sample project deleted.',
                );
                setDeleting(null);
              }}
            >
              Confirm delete project
            </Button>
          </div>
        </Modal>
      )}
    </section>
  );
}
