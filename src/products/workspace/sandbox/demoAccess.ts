import { networkApi } from '../../../api';
import type { DemoProfile, DemoTier } from '../demo/personaList';

const ACCESS_KEY = 'lamid-demo-identity';
export type DemoIdentity = {
  token: string;
  id: string;
  name: string;
  email: string;
  profile: DemoProfile;
  tier: DemoTier;
};
export function demoIdentity(): DemoIdentity | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(ACCESS_KEY) || 'null') as DemoIdentity | null;
    return value && /^[a-f0-9]{64}$/.test(value.token) ? value : null;
  } catch {
    return null;
  }
}
export function rememberDemo(value: DemoIdentity) {
  sessionStorage.setItem(ACCESS_KEY, JSON.stringify(value));
}
export function forgetDemoAccess() {
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem('lamid-demo-access');
}
export function demoRequest<T>(path: string, body: Record<string, unknown> = {}) {
  const identity = demoIdentity();
  if (!identity) return Promise.reject(new Error('Open your personal demo link to continue.'));
  return networkApi<T>(`/demo/${path}`, { ...body, token: identity.token });
}
export function trackDemo(
  event:
    | 'workspace_opened'
    | 'page_viewed'
    | 'tool_used'
    | 'signup_clicked'
    | 'operation_failed'
    | 'save_failed'
    | 'save_conflict'
    | 'client_failed',
  path: string,
  profile: DemoProfile,
  tier: DemoTier,
) {
  return demoRequest('events', { event, path: path.split('?')[0], profile, tier }).catch(() => {});
}
