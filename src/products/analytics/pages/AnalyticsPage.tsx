import { Download } from 'lucide-react';
import { PageHeading } from '../../../shared/workspace/PageHeading';
import { StatTile } from '../../../shared/workspace/ui/StatTile';
import type { WorkspaceState } from '../../../types';
import { useWorkspace } from '../../workspace/components/WorkspaceShell';
import type { Kpi } from '../../workspace/overview/overviewModel';
import { downloadJson } from '../../accounts/pages/AccountServicesPage';
import { Button } from '../../../shared/ui/Button';

const STATUSES = ['Planned', 'In progress', 'Needs review', 'Done', 'Paused'] as const;

/** Counts from the current workspace records: goals, actions, reviews and per-goal completion. */
export function AnalyticsSummary({ state }: { state: WorkspaceState }) {
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const completed = state.actions.filter((a) => a.status === 'Done').length;
  const reviewWeeks = Array.from({ length: 4 }, (_, index) => {
    const end = new Date(today);
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + 1 - index * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 7);
    return {
      label: index === 0 ? 'Last 7 days' : `${index * 7 + 1}–${(index + 1) * 7} days ago`,
      count: state.reviews.filter((review) => {
        const recorded = new Date(review.createdAt).getTime();
        return recorded >= start.getTime() && recorded < end.getTime();
      }).length,
    };
  });
  const overdue = state.actions.filter(
    (a) => a.status !== 'Done' && /^\d{4}-\d{2}-\d{2}$/.test(a.dueDate) && a.dueDate < date,
  ).length;
  const summary = {
    goals: state.objectives.length,
    activeGoals: state.objectives.filter((g) => g.status === 'Active').length,
    actions: state.actions.length,
    completedActions: completed,
    overdueActions: overdue,
    reviews: state.reviews.length,
  };
  const tiles: Kpi[] = [
    {
      domain: 'work',
      label: 'Active goals',
      value: String(summary.activeGoals),
      hint: `${summary.goals} goals in total`,
      to: '/os/clarity',
    },
    {
      domain: 'work',
      label: 'Completed actions',
      value: `${completed} / ${summary.actions}`,
      hint: 'Task completion, not outcomes',
      to: '/os/consistency',
    },
    {
      domain: 'risk',
      label: 'Overdue actions',
      value: String(overdue),
      hint: overdue ? 'Past their due date' : 'Nothing overdue',
      to: '/os/today',
    },
    {
      domain: 'intelligence',
      label: 'Recorded reviews',
      value: String(summary.reviews),
      hint: 'Reflections in this workspace',
      to: '/os/rhythm',
    },
  ];
  const statusCounts = STATUSES.map((status) => ({
    status,
    count: state.actions.filter((a) => a.status === status).length,
  }));
  const busiestWeek = Math.max(1, ...reviewWeeks.map((w) => w.count));
  return (
    <section className="ws-analytics" data-domain="intelligence" data-scroll-feedback="off">
      <div className="ws-panel-heading ws-analytics-head">
        <div>
          <h2>Workspace analytics</h2>
          <span>A snapshot of the goals, actions and reviews currently in this workspace.</span>
        </div>
        <Button
          variant="secondary"
          onClick={() =>
            downloadJson(
              {
                ...summary,
                exportedAt: new Date().toISOString(),
                scope: 'current workspace snapshot',
              },
              'lamid-analytics.json',
            )
          }
        >
          <Download size={15} /> Download summary
        </Button>
      </div>
      <div className="ws-kpis">
        {tiles.map((kpi) => (
          <StatTile kpi={kpi} key={kpi.label} />
        ))}
      </div>

      <div className="ws-analytics-grid">
        <section className="ws-panel">
          <div className="ws-panel-heading">
            <div>
              <h3>Action status</h3>
              <span>Where every action stands today.</span>
            </div>
          </div>
          <div className="ws-analytics-body">
            <div className="ws-status-bar" role="img" aria-label="Actions by status">
              {statusCounts
                .filter((s) => s.count > 0)
                .map((s) => (
                  <span
                    key={s.status}
                    data-status={s.status}
                    style={{ flexGrow: s.count }}
                    title={`${s.status}: ${s.count}`}
                  />
                ))}
            </div>
            <ul className="ws-status-legend">
              {statusCounts.map((s) => (
                <li key={s.status} data-status={s.status}>
                  <i aria-hidden="true" />
                  <span>{s.status}</span>
                  <strong>{s.count}</strong>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="ws-panel">
          <div className="ws-panel-heading">
            <div>
              <h3>Review cadence</h3>
              <span>Reviews recorded per week, last four weeks.</span>
            </div>
          </div>
          <div className="ws-analytics-body">
            <div className="ws-cadence" role="img" aria-label="Reviews per week">
              {[...reviewWeeks].reverse().map((week) => (
                <span key={week.label} title={`${week.label}: ${week.count}`}>
                  <i style={{ height: `${Math.max((week.count / busiestWeek) * 100, 4)}%` }} />
                  <b>{week.count}</b>
                  <small>{week.label}</small>
                </span>
              ))}
            </div>
            <p className="ws-footnote">
              Counts use recording dates. Action completion history is not captured here.
            </p>
          </div>
        </section>
      </div>

      <section className="ws-panel">
        <div className="ws-panel-heading">
          <div>
            <h3>Progress by goal</h3>
            <span>Completed actions out of all actions linked to each goal.</span>
          </div>
        </div>
        {!state.objectives.length ? (
          <p className="ws-ledger-none">Create a goal to see its action progress here.</p>
        ) : (
          <ul className="ws-goal-progress">
            {state.objectives.map((goal) => {
              const actions = state.actions.filter((a) => a.objectiveId === goal.id);
              const done = actions.filter((a) => a.status === 'Done').length;
              const pct = actions.length ? Math.round((done / actions.length) * 100) : 0;
              return (
                <li key={goal.id}>
                  <div>
                    <strong>{goal.title}</strong>
                    <span>
                      {done} of {actions.length} actions · {goal.status}
                    </span>
                  </div>
                  <div className="ws-progress" aria-label={`${goal.title} completion ${pct}%`}>
                    <div className="ws-progress-track">
                      <span style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <b>{pct}%</b>
                </li>
              );
            })}
          </ul>
        )}
        <p className="ws-footnote ws-footnote-pad">
          Counts reflect current records. Completed actions measure task completion; they do not
          establish business outcomes or historical trends.
        </p>
      </section>
    </section>
  );
}
export function AnalyticsPage() {
  const { state } = useWorkspace();
  return (
    <>
      <PageHeading
        eyebrow="INTELLIGENCE · ANALYTICS"
        title="Analytics"
        description="How work, money and talent are trending across your workspace."
      />
      <AnalyticsSummary state={state} />
    </>
  );
}
