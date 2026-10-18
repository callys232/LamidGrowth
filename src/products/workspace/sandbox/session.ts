import { setApiTransport } from '../../../api';
import { readDemoSession, sandboxKey } from './demoSession';
import { talentRoutes } from './handlers/talent';
import { toolRoutes } from './handlers/tools';
import { learningRoutes } from './handlers/learning';
import { workRoutes } from './handlers/work';
import { commerceRoutes } from './handlers/commerce';
import { workspaceRoutes } from './handlers/workspace';
import { seedPersona } from './personas';
import { createSandboxRouter } from './router';
import { createSessionStore } from './store';
import { demoIdentity, trackDemo } from './demoAccess';
import { connectDemoProgress } from './cloudProgress';
import { ApiError } from '../../../api';

/** The heavy half of the demo: loaded on demand (dynamic import) only for demo visitors. */
export { readDemoSession, startDemoSession, endDemoSession } from './demoSession';

/** Route `api()` to the sandbox for the current demo persona. Returns whether a demo is active. */
let activating: { key: string; promise: Promise<boolean> } | null = null;
export function activateSandboxIfDemo(): Promise<boolean> {
  const key = JSON.stringify([readDemoSession(), demoIdentity()?.id]);
  if (activating?.key === key) return activating.promise;
  const promise = activate().finally(() => {
    if (activating?.promise === promise) activating = null;
  });
  activating = { key, promise };
  return promise;
}
async function activate(): Promise<boolean> {
  const session = readDemoSession();
  if (!session) return false;
  const { profile, tier } = session;
  const identity = demoIdentity();
  if (!identity) throw new Error('Open your personal demo link to continue.');
  const key = `${sandboxKey(profile, tier)}:${identity.id}`;
  const store = createSessionStore(key, () => seedPersona(profile, tier, new Date()));
  const sync = await connectDemoProgress(profile, tier, key, store);
  const router = createSandboxRouter(
    [
      ...commerceRoutes,
      ...workspaceRoutes,
      ...workRoutes,
      ...talentRoutes,
      ...learningRoutes,
      ...toolRoutes,
    ],
    store,
  );
  setApiTransport(async (request) => {
    if (request.method !== 'GET' && !sync.canWrite())
      throw new ApiError('Reload to load the latest demo progress before making changes.', 409);
    let result;
    try {
      result = await router(request);
    } catch (error) {
      void trackDemo('operation_failed', window.location.pathname, profile, tier);
      throw error;
    }
    if (request.method !== 'GET') {
      await sync.flush();
      void trackDemo('tool_used', window.location.pathname, profile, tier);
    }
    return result;
  });
  if (sync.needsInitialSave) await sync.flush();
  void trackDemo('workspace_opened', '/demo/workspace', profile, tier);
  return true;
}
