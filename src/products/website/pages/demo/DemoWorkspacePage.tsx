import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  PROFILES,
  TIERS,
  type DemoProfile,
  type DemoTier,
} from '../../../workspace/demo/personaList';
import { startDemoSession } from '../../../workspace/sandbox/demoSession';

/** /demo/workspace?profile=SME&tier=team — starts a demo session and opens the real workspace on
 * that persona's sandboxed data. Unknown values fall back to Founder / individual. */
export function DemoWorkspacePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  useEffect(() => {
    const requested = params.get('profile') as DemoProfile;
    const requestedTier = params.get('tier') as DemoTier;
    const profile = PROFILES.includes(requested) ? requested : 'Founder';
    const tier = TIERS.includes(requestedTier) ? requestedTier : 'individual';
    startDemoSession(profile, tier);
    // The sandbox loads only for demo visitors; open the workspace once it is routing api().
    void import('../../../workspace/sandbox/session').then(({ activateSandboxIfDemo }) => {
      activateSandboxIfDemo();
      navigate('/os', { replace: true });
    });
  }, [params, navigate]);
  return (
    <main id="main" className="error-page" aria-busy="true">
      <p>Opening the sample workspace…</p>
    </main>
  );
}
