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
        Here is your user guide to help you get started. It opens automatically only once for your
        account. You can find it again from User guide in the sidebar.
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
