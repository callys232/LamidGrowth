import { CalendarDays, CheckCircle2, GitBranch, Plus, Target } from 'lucide-react';
import { contexts } from '../../../../../shared/lib/contexts';
import { appear, progress, sceneStyle, typed, type VideoProps } from './timeline';

/** Signup → dashboard, using the product's own wording (AuthMainSlide, AccountCredentialsForm,
 * DashboardHeadingSlide, DashboardStatisticsSlide, DashboardBriefingSlide). The dashboard numbers
 * are a labelled sample workspace. */
export const SIGNUP_DURATION = 12500;

const PICKED = 'Founder';
const NAME = 'Amara';
const EMAIL = 'amara@northwind.co';
const STATS = [
  { label: 'Active objectives', value: 3, detail: 'A direction worth moving toward', Icon: Target },
  {
    label: 'Actions in motion',
    value: 4,
    detail: 'Intent, turning into execution',
    Icon: GitBranch,
  },
  {
    label: 'Actions completed',
    value: 2,
    detail: 'Each step builds on the last',
    Icon: CheckCircle2,
  },
  {
    label: 'Reflections recorded',
    value: 1,
    detail: 'Learning that carries forward',
    Icon: CalendarDays,
  },
];
const TODAY = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' })
  .format(new Date())
  .toUpperCase();

export function SignupVideo({ t }: VideoProps) {
  // Step 1 · context: the highlight walks to Founder, which is chosen at 2.1s.
  const hover = t < 900 ? 0 : t < 1500 ? 1 : 3;
  const chosen = t >= 2100;
  const continuePressed = t >= 2900 && t < 3300;
  const password = '•'.repeat(Math.round(progress(t, 6000, 6800) * 10));
  const submitting = t >= 7200;

  return (
    <div className="dv-signup">
      <section className="dv-scene dv-auth" style={sceneStyle(t, 0, 3500)}>
        <span className="dv-eyebrow">YOUR FIRST STEP · 1 OF 2</span>
        <h4>
          Start with <em>your context.</em>
        </h4>
        <p>Where are you starting? Choose what fits your work today.</p>
        <ul className="dv-chips">
          {contexts.map((c, i) => (
            <li
              key={c}
              className={
                chosen && c === PICKED ? 'is-chosen' : !chosen && i === hover ? 'is-hover' : ''
              }
            >
              {c}
            </li>
          ))}
        </ul>
        <span className={continuePressed ? 'dv-button is-pressed' : 'dv-button'}>Continue →</span>
      </section>

      <section className="dv-scene dv-auth" style={sceneStyle(t, 3500, 7700)}>
        <span className="dv-eyebrow">YOUR FIRST STEP · 2 OF 2</span>
        <h4>
          A space to <em>make progress.</em>
        </h4>
        <p>Create your account to begin in a {PICKED.toLowerCase()} context.</p>
        <label className="dv-field">
          <span>Your name</span>
          <b>{typed(NAME, t, 3900, 4500) || <i>How should we call you?</i>}</b>
        </label>
        <label className="dv-field">
          <span>Email address</span>
          <b>{typed(EMAIL, t, 4700, 5800) || <i>you@example.com</i>}</b>
        </label>
        <label className="dv-field">
          <span>Password</span>
          <b>{password || <i>Create a strong password</i>}</b>
        </label>
        <span className={submitting ? 'dv-button is-pressed' : 'dv-button'}>
          {submitting ? 'One moment…' : 'Create your workspace'}
        </span>
      </section>

      <section className="dv-scene dv-dashboard" style={sceneStyle(t, 7700, SIGNUP_DURATION + 400)}>
        <header className="dv-dash-head">
          <div>
            <span className="dv-eyebrow">{TODAY}</span>
            <h4>A little clearer, {NAME}.</h4>
            <p>Here’s where things stand. Let’s make the next step count.</p>
          </div>
          <span className="dv-button dv-button-sm">
            <Plus size={13} aria-hidden="true" /> New objective
          </span>
        </header>
        <ul className="dv-stats">
          {STATS.map(({ label, value, detail, Icon }, i) => (
            <li key={label} style={appear(t, 8100 + i * 180)}>
              <span>
                <Icon size={13} aria-hidden="true" /> {label}
              </span>
              <b>{Math.round(value * progress(t, 8200 + i * 180, 9200 + i * 180))}</b>
              <small>{detail}</small>
            </li>
          ))}
        </ul>
        <div className="dv-briefing" style={appear(t, 9300)}>
          <div>
            <strong>Your daily briefing</strong>
            <small>A clear view of what needs you next.</small>
          </div>
          <div className="dv-briefing-move">
            <span>One recommended next move</span>
            <span className="dv-button dv-button-sm">Prepare my briefing</span>
          </div>
        </div>
        <span className="dv-sample-tag">Sample workspace</span>
      </section>
    </div>
  );
}
