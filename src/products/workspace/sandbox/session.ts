import { setApiTransport } from '../../../api';
import { readDemoSession, sandboxKey } from './demoSession';
import { talentRoutes } from './handlers/talent';
import { toolRoutes } from './handlers/tools';
import { workRoutes } from './handlers/work';
import { workspaceRoutes } from './handlers/workspace';
import { seedPersona } from './personas';
import { createSandboxRouter } from './router';
import { createSessionStore } from './store';

/** The heavy half of the demo: loaded on demand (dynamic import) only for demo visitors. */
export { readDemoSession, startDemoSession, endDemoSession } from './demoSession';

/** Route `api()` to the sandbox for the current demo persona. Returns whether a demo is active. */
export function activateSandboxIfDemo(): boolean {
  const session = readDemoSession();
  if (!session) return false;
  const { profile, tier } = session;
  const store = createSessionStore(sandboxKey(profile, tier), () =>
    seedPersona(profile, tier, new Date()),
  );
  setApiTransport(
    createSandboxRouter([...workspaceRoutes, ...workRoutes, ...talentRoutes, ...toolRoutes], store),
  );
  return true;
}
