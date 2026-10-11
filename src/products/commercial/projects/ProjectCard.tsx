import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusPill } from '../../../shared/workspace/ui/StatusPill';
import { currencyTotals, money } from '../escrow/escrowModel';
import type { SummaryProject } from '../escrowSummary';
import { nextMilestone, projectProgress, projectStage, STAGES } from './projectModel';

/** An awarded project at a glance: role, stage, milestone progress, what's next and money held. */
export function ProjectCard({ project }: { project: SummaryProject }) {
  const progress = projectProgress(project);
  const stage = projectStage(project);
  const next = nextMilestone(project);
  const held = currencyTotals([project]).filter((t) => t.held > 0);
  const role = project.isClient ? 'You fund' : project.isFreelancer ? 'You deliver' : 'Team member';
  return (
    <Link
      className="ws-project-card"
      to={`/os/commercial/projects/${project.id}`}
      data-stage={stage}
    >
      <div className="ws-project-top">
        <StatusPill
          tone={stage === 'review' ? 'opportunities' : stage === 'closed' ? 'money' : 'work'}
        >
          {STAGES.find((s) => s.key === stage)!.label}
        </StatusPill>
        <span className="ws-project-role">{role}</span>
      </div>
      <h3>
        {project.title}
        <ArrowUpRight size={16} aria-hidden="true" />
      </h3>
      <div
        className="ws-progress"
        aria-label={`${progress.done} of ${progress.total} milestones done`}
      >
        <div className="ws-progress-track">
          <span style={{ width: `${progress.pct}%` }} />
        </div>
        <small>
          {progress.total
            ? `${progress.done} of ${progress.total} milestones done · ${progress.pct}%`
            : 'No milestones yet'}
        </small>
      </div>
      <dl className="ws-project-facts">
        <div>
          <dt>Next</dt>
          <dd>{next ? next.title : progress.total ? 'All milestones done' : 'Add milestones'}</dd>
        </div>
        <div>
          <dt>Held</dt>
          <dd>
            {project.isTeamMember
              ? '—'
              : held.length
                ? held.map((t) => money(t.held, t.currency)).join(' · ')
                : 'Nothing held'}
          </dd>
        </div>
      </dl>
    </Link>
  );
}
