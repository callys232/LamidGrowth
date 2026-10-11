import { ApiError, type ApiTransport } from '../../../api';
import type { SandboxStore } from './store';

export type SandboxHandler = (ctx: {
  params: Record<string, string>;
  body: unknown;
  store: SandboxStore;
  /** The request's query string, e.g. ?q= for searches. */
  query: URLSearchParams;
}) => unknown | Promise<unknown>;

export type SandboxRoute = { method: string; pattern: string; handler: SandboxHandler };

/** Turn a pattern like `/projects/:id` into a matcher returning its params, or null. */
function matcher(pattern: string) {
  const parts = pattern.split('/');
  return (path: string) => {
    const segments = path.split('/');
    if (segments.length !== parts.length) return null;
    const params: Record<string, string> = {};
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].startsWith(':')) params[parts[i].slice(1)] = decodeURIComponent(segments[i]);
      else if (parts[i] !== segments[i]) return null;
    }
    return params;
  };
}

/** The demo's stand-in for the network: answers the routes it knows from the persona store and
 * refuses everything else with an explicit 501, never a silent fake success. */
export function createSandboxRouter(routes: SandboxRoute[], store: SandboxStore): ApiTransport {
  const table = routes.map((route) => ({ ...route, match: matcher(route.pattern) }));
  return async ({ path, method, body }) => {
    const [bare, search = ''] = path.split('?');
    const query = new URLSearchParams(search);
    for (const route of table) {
      if (route.method !== method) continue;
      const params = route.match(bare);
      if (!params) continue;
      const result = await route.handler({ params, body, store, query });
      return result === undefined ? undefined : structuredClone(result);
    }
    // Development builds name the refused route, so missing demo coverage is easy to find.
    if (import.meta.env?.DEV) console.debug('[sandbox] 501', method, bare);
    throw new ApiError('Not available in the demo.', 501);
  };
}
