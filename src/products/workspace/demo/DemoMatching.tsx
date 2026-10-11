import { useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import { Field } from '../../../shared/ui/Field';
import { Modal } from '../../../shared/ui/Modal';
import type { DemoWorkspace } from './scenarios';

export function DemoMatching({
  state,
  kind,
  change,
}: {
  state: DemoWorkspace;
  kind: 'jobs' | 'consultants';
  change: (update: (sample: DemoWorkspace) => DemoWorkspace, message: string) => void;
}) {
  const [projectId, setProjectId] = useState(state.projects[0]?.id ?? '');
  const [selected, setSelected] = useState('');
  const sent =
    kind === 'jobs' ? (state.matching?.applications ?? []) : (state.matching?.invitations ?? []);
  const project = state.projects.find((p) => p.id === projectId);
  const consultants = [
    {
      id: 'demo-consultant-1',
      headline: 'Strategy and delivery consultant',
      skills: ['Strategic planning', 'Delivery review', 'Decision analysis'],
    },
    {
      id: 'demo-consultant-2',
      headline: 'Finance and operating model specialist',
      skills: ['Cash forecasting', 'Operating models', 'Capacity planning'],
    },
    {
      id: 'demo-consultant-3',
      headline: 'Growth and research advisor',
      skills: ['Opportunity analysis', 'Customer research', 'Growth planning'],
    },
  ];
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>{kind === 'jobs' ? 'Job Matcher' : 'Find a consultant'}</h2>
          <span>
            {kind === 'jobs'
              ? 'Review sample client briefs and try the application flow.'
              : 'Build a sample shortlist for a selected project.'}
          </span>
        </div>
      </div>
      <p>Fictional demonstration. No live matching or messages are sent.</p>
      {kind === 'consultants' && (
        <Field label="Project to find consultants for">
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            {state.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </Field>
      )}
      <ul className="consultant-match-list">
        {kind === 'jobs'
          ? state.projects.map((p, index) => (
              <li key={p.id}>
                <h3>{p.title}</h3>
                <p>Sample client: {index % 2 ? 'North River Works' : 'Orion Studio'}</p>
                <p>{p.description}</p>
                <p>Deliverables: {p.milestones.map((m) => m.title).join(' · ')}</p>
                <Button disabled={sent.includes(p.id)} onClick={() => setSelected(p.id)}>
                  {sent.includes(p.id) ? 'Sample application sent' : 'Review job & apply'}
                </Button>
              </li>
            ))
          : project
            ? consultants.map((c) => (
                <li key={c.id}>
                  <strong>{c.headline}</strong>
                  <p>{c.skills.join(' · ')}</p>
                  <p>
                    Sample profile for {project.title}. Review the scope and credentials before
                    engaging a consultant.
                  </p>
                  <Button
                    disabled={sent.includes(`${project.id}:${c.id}`)}
                    onClick={() => {
                      change(
                        (s) => ({
                          ...s,
                          matching: {
                            applications: s.matching?.applications ?? [],
                            invitations: [
                              ...(s.matching?.invitations ?? []),
                              `${project.id}:${c.id}`,
                            ],
                          },
                        }),
                        'Sample consultant invitation recorded. No message sent.',
                      );
                    }}
                  >
                    {sent.includes(`${project.id}:${c.id}`)
                      ? 'Sample invitation sent'
                      : 'Invite to this project'}
                  </Button>
                </li>
              ))
            : null}
      </ul>
      {!state.projects.length && <p>Add a sample project to demonstrate this flow.</p>}
      {selected && (
        <Modal title="Review sample job" onClose={() => setSelected('')}>
          <h3>{state.projects.find((p) => p.id === selected)?.title}</h3>
          <p>{state.projects.find((p) => p.id === selected)?.description}</p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              change(
                (s) => ({
                  ...s,
                  matching: {
                    applications: [...(s.matching?.applications ?? []), selected],
                    invitations: s.matching?.invitations ?? [],
                  },
                }),
                'Sample job application recorded. No bid or points charge created.',
              );
              setSelected('');
            }}
          >
            <Field label="Application summary">
              <textarea required minLength={20} maxLength={5000} />
            </Field>
            <div className="modal-actions">
              <Button variant="secondary" onClick={() => setSelected('')}>
                Cancel
              </Button>
              <Button type="submit">Submit sample application</Button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
