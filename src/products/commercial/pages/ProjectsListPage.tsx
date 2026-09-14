import { Briefcase, HandHelping } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Empty } from '../../../shared/ui/Empty';
import { StatusPill } from '../../../shared/workspace/StatusPill';
import { useHandoffsList, useProjectsList } from '../hooks/useProjectsPage';

/** /os/commercial/projects — every project you're a client or freelancer on. */
export function ProjectsListPage() {
  const { projects, loading, error } = useProjectsList();
  const handoffsList = useHandoffsList();
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Projects</h2>
          <span>Milestones, deliverables, and approvals for awarded work.</span>
        </div>
      </div>
      {loading && <p className="activity-feed-status">Loading…</p>}
      {error && <p className="activity-feed-status activity-feed-error">{error}</p>}
      {!loading && !error && projects.length === 0 && (
        <Empty title="No projects yet">
          Create a project from an awarded job to track milestones and deliverables here.
        </Empty>
      )}
      {!loading && !error && projects.length > 0 && (
        <ol className="activity-feed-list">
          {projects.map((project) => (
            <li key={project.id} className="activity-feed-row">
              <span className="activity-feed-icon">
                <Briefcase size={15} />
              </span>
              <Link className="activity-feed-title" to={`/os/commercial/projects/${project.id}`}>
                {project.title}
              </Link>
              <StatusPill status={project.status} />
            </li>
          ))}
        </ol>
      )}

      <div className="panel-heading" style={{ marginTop: 32 }}>
        <div>
          <h3>AI-to-human handoffs</h3>
          <span>Where an agent asked for qualified human judgment, and what happened to that request.</span>
        </div>
      </div>
      {handoffsList.loading && <p className="activity-feed-status">Loading…</p>}
      {!handoffsList.loading && handoffsList.handoffs.length === 0 && (
        <Empty title="No handoffs yet">
          When an agent needs qualified human judgment mid-workflow, it can hand off the exact context here.
        </Empty>
      )}
      {!handoffsList.loading && handoffsList.handoffs.length > 0 && (
        <ol className="activity-feed-list">
          {handoffsList.handoffs.map((handoff) => (
            <li key={handoff.id} className="activity-feed-row">
              <span className="activity-feed-icon">
                <HandHelping size={15} />
              </span>
              <span className="activity-feed-title">
                <strong>{handoff.source}</strong>
                <br />
                <small>{handoff.context_summary}</small>
              </span>
              <StatusPill status={handoff.status} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
