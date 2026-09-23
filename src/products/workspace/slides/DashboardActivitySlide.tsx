import {
  Activity,
  Bot,
  Briefcase,
  Coins,
  FileText,
  GitBranch,
  Target,
  Workflow,
} from 'lucide-react';
import { Empty } from '../../../shared/ui/Empty';
import { StatusPill } from '../../../shared/workspace/StatusPill';
import type { ActivityItem } from '../hooks/useActivityFeed';
import { useActivityFeed } from '../hooks/useActivityFeed';

const iconFor: Record<ActivityItem['type'], typeof Activity> = {
  objective: Target,
  action: GitBranch,
  job: Briefcase,
  bid: FileText,
  proposal: FileText,
  workflow: Workflow,
  agent_run: Bot,
  points: Coins,
};

const timeLabel = (value: string) =>
  new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));

/** Every activity across objectives, marketplace, workflows, and the Companion in one feed. */
export function DashboardActivitySlide() {
  const { items, loading, error } = useActivityFeed();
  return (
    <section className="panel activity-feed">
      <div className="panel-heading">
        <div>
          <h2>Everything happening in your workspace</h2>
          <span>
            Objectives, marketplace activity, workflows, and Companion agents in one place.
          </span>
        </div>
      </div>
      {loading && <p className="activity-feed-status">Loading…</p>}
      {error && <p className="activity-feed-status activity-feed-error">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <Empty title="Nothing here yet">
          Once you create an objective, post a job, or run a workflow, it will show up here.
        </Empty>
      )}
      {!loading && !error && items.length > 0 && (
        <ol className="activity-feed-list">
          {items.map((item) => {
            const Icon = iconFor[item.type];
            return (
              <li key={`${item.type}-${item.id}`} className="activity-feed-row">
                <span className="activity-feed-icon">
                  <Icon size={15} />
                </span>
                <span className="activity-feed-title">{item.title}</span>
                <StatusPill status={item.status} />
                <span className="activity-feed-time">{timeLabel(item.createdAt)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
