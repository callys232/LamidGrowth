import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  PROFILES,
  TIERS,
  type DemoProfile,
  type DemoTier,
} from '../../../workspace/demo/personaList';
import { startDemoSession } from '../../../workspace/sandbox/demoSession';
import { demoIdentity } from '../../../workspace/sandbox/demoAccess';

/** Only workspace pages are valid return targets, so `next` can never send a visitor elsewhere. */
const workspacePath = (next: string | null) =>
  next && /^\/os(\/[\w\-/]*)?$/.test(next) ? next : '/os';

/** /demo/workspace?profile=SME&tier=team[&next=/os/escrows] — starts a demo session and opens the
 * real workspace on that persona's sandboxed data. Unknown values fall back to Founder /
 * individual; `next` returns to a workspace page (used by the banner's persona switch). */
export function DemoWorkspacePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const saved = demoIdentity();
    const requested = params.get('profile') as DemoProfile;
    const requestedTier = params.get('tier') as DemoTier;
    const profile = PROFILES.includes(requested) ? requested : saved?.profile || 'Founder';
    const tier = TIERS.includes(requestedTier) ? requestedTier : saved?.tier || 'individual';
    const next = workspacePath(params.get('next'));
    startDemoSession(profile, tier);
    // The sandbox loads only for demo visitors; open the workspace once it is routing api().
    void import('../../../workspace/sandbox/session')
      .then(async ({ activateSandboxIfDemo }) => {
        await activateSandboxIfDemo();
        if (active) navigate(next, { replace: true });
      })
      .catch((cause: Error) => {
        if (active) setError(cause.message);
      });
    return () => {
      active = false;
    };
  }, [params, navigate]);
  return (
    <main id="main" className="error-page" aria-busy={!error}>
      {error ? (
        <>
          <p role="alert">{error}</p>
          <Link to="/demo">Return to demo access</Link>
          <button onClick={() => window.location.reload()}>Retry</button>
        </>
      ) : (
        <p>Opening your saved sample workspace…</p>
      )}
    </main>
  );
}
