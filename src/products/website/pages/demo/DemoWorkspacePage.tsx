import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  PROFILES,
  TIERS,
  type DemoProfile,
  type DemoTier,
} from '../../../workspace/demo/personaList';
import { startDemoSession } from '../../../workspace/sandbox/demoSession';

/** Only workspace pages are valid return targets, so `next` can never send a visitor elsewhere. */
const workspacePath = (next: string | null) =>
  next && /^\/os(\/[\w\-/]*)?$/.test(next) ? next : '/os';

/** /demo/workspace?profile=SME&tier=team[&next=/os/escrows] — starts a demo session and opens the
 * real workspace on that persona's sandboxed data. Unknown values fall back to Founder /
 * individual; `next` returns to a workspace page (used by the banner's persona switch). */
export function DemoWorkspacePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  useEffect(() => {
    const requested = params.get('profile') as DemoProfile;
    const requestedTier = params.get('tier') as DemoTier;
    const profile = PROFILES.includes(requested) ? requested : 'Founder';
    const tier = TIERS.includes(requestedTier) ? requestedTier : 'individual';
    const next = workspacePath(params.get('next'));
    startDemoSession(profile, tier);
    // The sandbox loads only for demo visitors; open the workspace once it is routing api().
    void import('../../../workspace/sandbox/session').then(({ activateSandboxIfDemo }) => {
      activateSandboxIfDemo();
      navigate(next, { replace: true });
    });
  }, [params, navigate]);
  return (
    <main id="main" className="error-page" aria-busy="true">
      <p>Opening the sample workspace…</p>
    </main>
  );
}
