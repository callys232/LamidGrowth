import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  demoSaveStatus,
  retryDemoSave,
  loadLatestDemo,
  type DemoSaveStatus,
} from '../../../workspace/sandbox/cloudProgress';
import { demoRequest, trackDemo } from '../../../workspace/sandbox/demoAccess';
import { endDemoSession, readDemoSession } from '../../../workspace/sandbox/demoSession';
import demoCapabilities from '../../../../shared/demoCapabilities.json';

export function DemoProgressNotice() {
  const [status, setStatus] = useState(demoSaveStatus);
  const [message, setMessage] = useState('');
  const [reminders, setReminders] = useState(false);
  useEffect(() => {
    const update = (event: Event) => setStatus((event as CustomEvent<DemoSaveStatus>).detail);
    window.addEventListener('demo-save-status', update);
    void demoRequest<{ followup: boolean }>('session')
      .then((value) => setReminders(value.followup))
      .catch(() => {});
    return () => window.removeEventListener('demo-save-status', update);
  }, []);
  async function stopReminders() {
    try {
      await demoRequest('preferences', { followup: false });
      setReminders(false);
      setMessage('Demo reminders stopped.');
    } catch {
      setMessage('Could not update reminders. Please try again.');
    }
  }
  return (
    <aside className="demo-progress-notice" aria-label="Your demo progress">
      <p role="status">
        {status.message}{' '}
        {status.state === 'error' && (
          <>
            <button type="button" onClick={() => void retryDemoSave()}>
              Retry save
            </button>{' '}
            <button type="button" onClick={loadLatestDemo}>
              Reload latest demo
            </button>
          </>
        )}
      </p>
      <p>
        Start with a goal, explore a project, then try a decision tool. Use sample information; your
        changes are saved for your next visit.
      </p>
      <details>
        <summary>What you can try in this demo</summary>
        <ul>
          {Object.entries(demoCapabilities.features).map(([name, feature]) => (
            <li key={name}>{feature.description}</li>
          ))}
        </ul>
      </details>
      <Link to="/os">Explore goals</Link>
      {' · '}
      <Link to="/os/commercial/projects">Explore projects</Link>
      {' · '}
      <Link to="/os/engines">Try a tool</Link>
      {' · '}
      <Link
        to="/signup"
        onClick={() => {
          const session = readDemoSession();
          if (session) void trackDemo('signup_clicked', '/signup', session.profile, session.tier);
          endDemoSession();
        }}
      >
        Create an account with your own data
      </Link>
      {reminders && (
        <p>
          <button type="button" onClick={() => void stopReminders()}>
            Stop demo reminder emails
          </button>
        </p>
      )}
      {message && <p role="status">{message}</p>}
    </aside>
  );
}
