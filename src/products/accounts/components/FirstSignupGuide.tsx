import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { api } from '../../../api';
import { Modal } from '../../../shared/ui/Modal';

const UserGuide = lazy(() =>
  import('../../website/pages/guides/UserGuide').then((module) => ({ default: module.UserGuide })),
);

export function FirstSignupGuide({ userId, demo }: { userId: string; demo: boolean }) {
  const [shownFor, setShownFor] = useState<string | null>(null);
  const claim = useRef<{ userId: string; promise: Promise<{ showGuide: boolean }> } | null>(null);
  useEffect(() => {
    if (demo) return;
    // Share the request across Strict Mode's effect replay so it cannot consume a second claim.
    if (claim.current?.userId !== userId)
      claim.current = {
        userId,
        promise: api<{ showGuide: boolean }>('/onboarding/user-guide/claim', {}),
      };
    let active = true;
    void claim.current.promise
      .then((result) => {
        if (active && result.showGuide) setShownFor(userId);
      })
      .catch(() => {
        /* Onboarding must not block access to the workspace. */
      });
    return () => {
      active = false;
    };
  }, [userId, demo]);
  if (demo || shownFor !== userId) return null;
  return (
    <Modal title="Welcome to LAMID ONE" wide onClose={() => setShownFor(null)}>
      <p>
        Start with one bottleneck: name the outcome you want, check the evidence, then create an
        action with an owner and review date. Your Overview shows the next step from your saved
        work. This guide opens automatically once; find it again from User guide in the sidebar.
      </p>
      <button type="button" className="button" onClick={() => setShownFor(null)}>
        Continue to workspace
      </button>
      <Suspense fallback={<p role="status">Loading your guide…</p>}>
        <UserGuide />
      </Suspense>
    </Modal>
  );
}
