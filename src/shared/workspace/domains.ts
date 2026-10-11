import { NAV_SECTIONS } from './navigation';

/** Workspace domains; each has an active colour (see src/workspace-ui.css). */
export type Domain =
  'work' | 'money' | 'talent' | 'opportunities' | 'risk' | 'intelligence' | 'account';

const ROUTES = NAV_SECTIONS.flatMap((section) => section.items)
  .map((entry) => ({ to: entry.to, domain: entry.domain }))
  .sort((a, b) => b.to.length - a.to.length);

/** The domain of the tool a workspace path belongs to (longest matching nav prefix). */
export function domainForPath(path: string): Domain {
  const match = ROUTES.find(
    (route) => route.to !== '/os' && (path === route.to || path.startsWith(`${route.to}/`)),
  );
  return match?.domain ?? 'work';
}
