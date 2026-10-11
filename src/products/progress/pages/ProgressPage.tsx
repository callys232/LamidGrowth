import { ArrowUpRight, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../../shared/workspace/ui/PageHeader';
import type { Kpi } from '../../workspace/overview/overviewModel';
import { useProgressPage } from '../hooks/useProgressPage';
import { progressTrends } from '../progressModel';

const day = (iso: string) =>
  new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(iso));

/** /os/progress — recorded completion per objective over time, next to today's workspace. */
export function Progress() {
  const page = useProgressPage();
  const { state } = page;
  const trends = progressTrends(page.snapshots);
  const done = state.actions.filter((a) => a.status === 'Done').length;
  const latest = page.snapshots
    .map((s) => s.createdAt)
    .sort()
    .at(-1);
  const kpis: Kpi[] = [
    {
      domain: 'work',
      label: 'Actions complete',
      value: `${done} / ${state.actions.length}`,
      hint: 'Across every objective today',
      to: '/os/consistency',
    },
    {
      domain: 'work',
      label: 'Objectives tracked',
      value: String(trends.length),
      hint: `${page.snapshots.length} recorded snapshots`,
      to: '/os/progress',
    },
    {
      domain: 'intelligence',
      label: 'Reflections',
      value: String(state.reviews.length),
      hint: 'Learning carried forward',
      to: '/os/rhythm',
    },
    {
      domain: 'work',
      label: 'Last recorded',
      value: latest ? day(latest) : '—',
      hint: latest ? 'Most recent snapshot' : 'No snapshots yet',
      to: '/os/progress',
    },
  ];
  return (
    <div className="ws-page" data-domain="work">
      <PageHeader
        eyebrow="PROGRESS"
        title="Evidence over time"
        description="Compare recorded progress with the work in front of you."
        kpis={kpis}
      />
      {page.error && (
        <p role="alert" className="form-error">
          {page.error}
        </p>
      )}
      <section className="ws-panel" aria-labelledby="trends-title">
        <div className="ws-panel-heading">
          <div>
            <h2 id="trends-title">Recorded progress by objective</h2>
            <span>Each bar is a snapshot of completed actions at the time it was recorded.</span>
          </div>
          <Link className="text-button" to="/os/rhythm">
            Record a reflection <ArrowUpRight size={14} />
          </Link>
        </div>
        {trends.length === 0 ? (
          <div className="ws-panel-state ws-empty">
            <TrendingUp size={28} aria-hidden="true" />
            <h3>Build an evidence history</h3>
            <p>
              Run an approved progress-recording workflow to capture your first snapshot.{' '}
              <Link to="/os/workflows">Open workflows</Link>
            </p>
          </div>
        ) : (
          <div className="ws-trends">
            {trends.map((trend) => {
              const objective = state.objectives.find((o) => o.id === trend.objectiveId);
              const last = trend.points.at(-1)!;
              return (
                <article className="ws-trend" key={trend.objectiveId}>
                  <header>
                    <strong>{objective?.title ?? 'Recorded objective'}</strong>
                    <span
                      className="ws-trend-change"
                      data-direction={trend.change > 0 ? 'up' : trend.change < 0 ? 'down' : 'flat'}
                    >
                      {trend.change > 0 ? '+' : ''}
                      {trend.change} pts
                    </span>
                  </header>
                  <div className="ws-trend-body">
                    <div>
                      <span className="ws-trend-value">{trend.current}%</span>
                      <small>
                        {last.completed} of {last.total} actions complete
                      </small>
                    </div>
                    <div
                      className="ws-trend-bars"
                      role="img"
                      aria-label={`Completion by snapshot: ${trend.points.map((p) => `${p.pct}%`).join(', ')}`}
                    >
                      {trend.points.map((point) => (
                        <span key={point.id} title={`${day(point.at)} · ${point.pct}%`}>
                          <i style={{ height: `${Math.max(point.pct, 4)}%` }} />
                        </span>
                      ))}
                    </div>
                  </div>
                  <ol className="ws-trend-points">
                    {[...trend.points].reverse().map((point) => (
                      <li key={point.id}>
                        <time dateTime={point.at}>{day(point.at)}</time>
                        <span>
                          {point.completed}/{point.total} · {point.pct}%
                        </span>
                      </li>
                    ))}
                  </ol>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
