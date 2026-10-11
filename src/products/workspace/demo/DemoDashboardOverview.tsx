import { CalendarDays, Plus, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';
import { DashboardHeadingSlide } from '../slides/DashboardHeadingSlide';
import { DashboardStatisticsSlide } from '../slides/DashboardStatisticsSlide';
import { ProjectEscrowSummary } from '../components/ProjectEscrowSummary';
import { Button } from '../../../shared/ui/Button';
import { StatusPill } from '../../../shared/workspace/StatusPill';
import type { DemoWorkspace } from './scenarios';

export function DemoDashboardOverview({
  state,
  createGoal,
  createAction,
  editGoal,
  open,
}: {
  state: DemoWorkspace;
  createGoal: () => void;
  createAction: () => void;
  editGoal: (id: string) => void;
  open: (view: 'Goals' | 'Projects' | 'Escrows' | 'Actions' | 'Rhythm' | 'Tools') => void;
}) {
  const active = state.objectives.filter((o) => o.status === 'Active');
  const pending = state.actions.filter((a) => a.status === 'Needs review');
  const next = state.actions.filter((a) => a.status !== 'Done' && a.status !== 'Paused');
  return (
    <>
      <DashboardHeadingSlide state={state} newObjective={createGoal} />
      <section className="panel dashboard-briefing">
        <div className="panel-heading">
          <div>
            <h2>Your daily briefing</h2>
            <span>A clear view of what needs you next.</span>
          </div>
          <Sparkles size={20} />
        </div>
        <div className="briefing-columns">
          <div>
            <h3>What changed</h3>
            <p>
              {state.actions.filter((a) => a.status === 'Done').length} actions completed.{' '}
              {pending.length} awaiting review.
            </p>
            <h3>Needs attention</h3>
            {next.slice(0, 3).map((action) => (
              <button key={action.id} className="briefing-record" onClick={() => open('Actions')}>
                {action.title}
                <small>{action.status}</small>
              </button>
            ))}
          </div>
          <div>
            <h3>Your priorities</h3>
            {active.map((goal) => (
              <button key={goal.id} className="briefing-record" onClick={() => editGoal(goal.id)}>
                {goal.title}
                <small>{goal.priority} priority</small>
              </button>
            ))}
            <p className="briefing-note">Sample briefing based on this demo’s goals and actions.</p>
          </div>
        </div>
      </section>
      <section className="dashboard-intro">
        <div className="focus-panel">
          <div className="focus-copy">
            <span className="eyebrow">YOUR NEXT CHAPTER</span>
            <h2>
              Meaningful progress.
              <br />
              One clear step at a time.
            </h2>
            <p>
              You’re working toward {active.length} objectives. Keep your priorities close, and your
              next action closer.
            </p>
            <Button variant="light" onClick={() => open('Tools')}>
              <Sparkles size={15} /> Explore decision tools
            </Button>
          </div>
          <div className="focus-orbit" aria-hidden="true">
            <div />
            <div />
            <div />
            <span>ONE</span>
            <i />
          </div>
          <span className="focus-footnote">YOUR CONTEXT. YOUR DIRECTION.</span>
        </div>
        <div className="judgment-panel">
          <div>
            <span className="judgment-icon">
              <ShieldCheck size={20} />
            </span>
            <span className="tag">HUMAN JUDGMENT</span>
          </div>
          <h3>
            {pending.length ? 'Your perspective makes the difference.' : 'You’re in control.'}
          </h3>
          <p>{pending.length} actions are ready for your review.</p>
          <button className="text-button" onClick={() => open('Actions')}>
            Review what needs you <ArrowRight size={17} />
          </button>
        </div>
      </section>
      <DashboardStatisticsSlide
        active={active}
        state={state}
        done={state.actions.filter((a) => a.status === 'Done').length}
      />
      <ProjectEscrowSummary
        projectCount={state.projects.length}
        escrows={state.escrows}
        onProjects={() => open('Projects')}
        onEscrows={() => open('Escrows')}
      />
      <section className="dashboard-section">
        <div className="panel-heading">
          <div>
            <h2>Your focus</h2>
            <span>The outcomes behind your work.</span>
          </div>
          <button className="text-button" onClick={() => open('Goals')}>
            All objectives <ArrowRight size={15} />
          </button>
        </div>
        <div className="objective-grid">
          {active.slice(0, 3).map((goal) => {
            const actions = state.actions.filter((a) => a.objectiveId === goal.id);
            const done = actions.filter((a) => a.status === 'Done').length;
            return (
              <article className="objective-card" key={goal.id}>
                <div className="objective-card-top">
                  <span className={`priority priority-${goal.priority.toLowerCase()}`}>
                    {goal.priority} priority
                  </span>
                  <span>{goal.context}</span>
                </div>
                <h3>{goal.title}</h3>
                <p>{goal.description}</p>
                <div className="objective-progress">
                  <span>
                    {done} of {actions.length} actions complete
                  </span>
                  <strong>{actions.length ? Math.round((done / actions.length) * 100) : 0}%</strong>
                </div>
                <progress value={done} max={actions.length || 1} />
                <div className="objective-card-bottom">
                  <span>
                    <CalendarDays size={13} />
                    {goal.targetDate}
                  </span>
                  <button className="text-button" onClick={() => editGoal(goal.id)}>
                    Edit goal
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        {!active.length && <Button onClick={createGoal}>Create your first objective</Button>}
      </section>
      <div className="dashboard-bottom">
        <section className="panel next-actions">
          <div className="panel-heading">
            <div>
              <h2>Make your next move</h2>
              <span>Small steps. Connected to the bigger picture.</span>
            </div>
            <button className="icon-button" aria-label="Add action" onClick={createAction}>
              <Plus size={19} />
            </button>
          </div>
          {next.slice(0, 4).map((action) => (
            <button key={action.id} className="briefing-record" onClick={() => open('Actions')}>
              {action.title}
              <StatusPill status={action.status} />
            </button>
          ))}
          <button className="panel-bottom-link text-button" onClick={() => open('Actions')}>
            See all your actions <ArrowRight size={15} />
          </button>
        </section>
        <section className="rhythm-nudge">
          <div className="rhythm-nudge-icon">
            <CalendarDays size={23} />
          </div>
          <span className="eyebrow">BUILD YOUR RHYTHM</span>
          <h3>
            A moment to reflect.
            <br />
            <em>A better next week.</em>
          </h3>
          <p>
            What moved forward? What did you learn? Carry the useful parts into your next cycle.
          </p>
          <button className="text-button" onClick={() => open('Rhythm')}>
            Start a reflection <ArrowRight size={16} />
          </button>
        </section>
      </div>
      <section className="panel activity-feed">
        <div className="panel-heading">
          <div>
            <h2>Everything happening in your workspace</h2>
            <span>Sample objectives, projects, escrow activity, and reviews.</span>
          </div>
        </div>
        <ol className="activity-feed-list">
          {state.audit.slice(0, 8).map((event) => (
            <li className="activity-feed-row" key={event.id}>
              <span className="activity-feed-title">{event.action}</span>
              <span className="activity-feed-time">
                {new Date(event.createdAt).toLocaleDateString('en', {
                  timeZone: 'America/Phoenix',
                })}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
