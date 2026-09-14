import { Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Empty } from '../../../shared/ui/Empty';
import { StatusPill } from '../../../shared/workspace/StatusPill';
import { useProjectsList } from '../hooks/useProjectsPage';

/** /os/commercial/projects — every project you're a client or freelancer on. */
export function ProjectsListPage() {
  const { projects, loading, error } = useProjectsList();
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
    </section>
  );
}
