import { useEffect, useState } from 'react';
import { api } from '../../../api';
import { isOpenDispute } from '../../../shared/workspace/disputeStatus';
import type { WorkspaceActivity } from '../../../shared/workspace/navigation';

const INACTIVE: WorkspaceActivity = { hasProject: false, hasTalentProfile: false, openDisputes: 0 };
const CHANGED = 'lamid:workspace-activity';

/** Tell the shell that projects, the talent profile or disputes changed, so its badges refresh. */
export function notifyActivityChanged() {
  window.dispatchEvent(new Event(CHANGED));
}

/** What the workspace is actively using, so the shell can promote those tools. A failing source
 * counts as inactive: the shell must never break because one of these endpoints did. Refetches when
 * `scope` (the workspace id) changes, and whenever notifyActivityChanged() is called. */
export function useWorkspaceActivity(scope?: string): WorkspaceActivity {
  const [activity, setActivity] = useState(INACTIVE);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const bump = () => setRevision((r) => r + 1);
    window.addEventListener(CHANGED, bump);
    return () => window.removeEventListener(CHANGED, bump);
  }, []);
  useEffect(() => {
    let live = true;
    const settle = <T>(path: string) => api<T>(path).catch(() => null);
    void Promise.all([
      settle<unknown[]>('/projects'),
      settle<unknown>('/talent/profile/mine'),
      settle<{ status: string }[]>('/disputes'),
    ]).then(([projects, profile, disputes]) => {
      if (!live) return;
      setActivity({
        hasProject: Array.isArray(projects) && projects.length > 0,
        hasTalentProfile: profile != null && typeof profile === 'object',
        openDisputes: Array.isArray(disputes)
          ? disputes.filter((d) => isOpenDispute(d?.status)).length
          : 0,
      });
    });
    return () => {
      live = false;
    };
  }, [scope, revision]);
  return activity;
}
