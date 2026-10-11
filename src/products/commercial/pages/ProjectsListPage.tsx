import { Briefcase, HandHelping } from 'lucide-react';
import { Empty } from '../../../shared/ui/Empty';
import { SkeletonList } from '../../../shared/ui/Skeleton';
import { StatusPill } from '../../../shared/workspace/StatusPill';
import { PageHeader } from '../../../shared/workspace/ui/PageHeader';
import { InternalProjects } from '../components/InternalProjects';
import { useEscrows } from '../hooks/useEscrows';
import { useHandoffsList } from '../hooks/useProjectsPage';
import { ProjectCard } from '../projects/ProjectCard';
import { projectKpis } from '../projects/projectModel';

/** /os/commercial/projects — awarded projects you fund, deliver or support, with stage, progress
 * and escrow; then internal delivery plans and AI-to-human handoffs. */
export function ProjectsListPage() {
  const page = useEscrows();
  const handoffsList = useHandoffsList();
  return (
    <div className="ws-page" data-domain="work" data-scroll-feedback="off">
      <PageHeader
        eyebrow="WORK · PROJECTS"
        title="Projects"
        description="Awarded client work with milestones, escrow and approvals — and your internal delivery plans."
        kpis={page.loading || page.error ? [] : projectKpis(page.projects)}
        loadingKpis={page.loading ? 4 : 0}
      />
      <section className="ws-panel" aria-labelledby="awarded-title">
        <div className="ws-panel-heading">
          <div>
            <h2 id="awarded-title">Awarded projects</h2>
            <span>Every project you’re the client, freelancer or team member on.</span>
          </div>
        </div>
        {page.loading ? (
          <div className="ws-project-grid">
            <SkeletonList rows={3} />
          </div>
        ) : page.error ? (
          <div className="ws-panel-state" role="alert">
            <p>{page.error}</p>
            <button className="text-button" onClick={page.retry}>
              Try again
            </button>
          </div>
        ) : page.projects.length === 0 ? (
          <div className="ws-panel-state ws-empty">
            <Briefcase size={28} aria-hidden="true" />
            <h3>No awarded projects yet</h3>
            <p>Award a job to a freelancer to open a project with milestones and escrow.</p>
          </div>
        ) : (
          <div className="ws-project-grid">
            {page.projects.map((project) => (
              <ProjectCard project={project} key={project.id} />
            ))}
          </div>
        )}
      </section>

      <section className="panel ws-legacy-panel">
        <InternalProjects />
      </section>

      <section className="panel ws-legacy-panel">
        <div className="panel-heading">
          <div>
            <h3>AI-to-human handoffs</h3>
            <span>
              Where an agent asked for qualified human judgment, and what happened to that request.
            </span>
          </div>
        </div>
        {handoffsList.loading && <SkeletonList rows={2} />}
        {!handoffsList.loading && handoffsList.handoffs.length === 0 && (
          <Empty title="No handoffs yet">
            When an agent needs qualified human judgment mid-workflow, it can hand off the exact
            context here.
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
    </div>
  );
}
