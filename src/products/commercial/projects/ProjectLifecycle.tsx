import type { Project } from '../hooks/useProjectsPage';
import { projectProgress, projectStage, STAGES } from './projectModel';

const MILESTONE_LABEL: Record<string, string> = {
  planned: 'Planned',
  submitted: 'Submitted',
  in_review: 'In review',
  approved: 'Approved',
  revision_requested: 'Revision requested',
  disputed: 'Disputed',
  releasing: 'Releasing',
  paid: 'Paid',
};
const money = (amount: number, currency: string) =>
  new Intl.NumberFormat('en', { style: 'currency', currency }).format(amount);

/** The project's stage across set up → delivery → review → closed, and each milestone's state. */
export function ProjectLifecycle({ project }: { project: Project }) {
  const stage = projectStage(project);
  const current = STAGES.findIndex((s) => s.key === stage);
  const progress = projectProgress(project);
  return (
    <section
      className="ws-panel ws-lifecycle-panel"
      aria-label="Project lifecycle"
      data-scroll-feedback="off"
    >
      <ol className="ws-lifecycle">
        {STAGES.map((s, index) => (
          <li
            key={s.key}
            data-state={index < current ? 'done' : index === current ? 'current' : 'next'}
            aria-current={index === current ? 'step' : undefined}
          >
            <span className="ws-lifecycle-dot" aria-hidden="true">
              {index + 1}
            </span>
            <span>
              <strong>{s.label}</strong>
              <small>{s.hint}</small>
            </span>
          </li>
        ))}
      </ol>
      {project.milestones.length > 0 && (
        <div className="ws-milestone-strip-wrap">
          <div className="ws-milestone-strip-head">
            <strong>Milestones</strong>
            <span>
              {progress.done} of {progress.total} done
            </span>
          </div>
          <ol className="ws-milestone-strip">
            {project.milestones.map((m) => (
              <li key={m.id} data-status={m.status} title={MILESTONE_LABEL[m.status] ?? m.status}>
                <span className="ws-milestone-bar" aria-hidden="true" />
                <strong>{m.title}</strong>
                <small>
                  {MILESTONE_LABEL[m.status] ?? m.status.replaceAll('_', ' ')} ·{' '}
                  {money(m.amount, m.currency)}
                </small>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
