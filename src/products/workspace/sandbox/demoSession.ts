import { setApiTransport } from '../../../api';
import { PROFILES, TIERS, type DemoProfile, type DemoTier } from '../demo/personaList';

/** The demo-session flag, kept light so every visitor can check it cheaply: the sandbox itself
 * (seeds, routes, persona content) loads only when a demo session exists (see session.ts).
 * Only an explicit demo session turns the sandbox on; a normal signed-in tab never uses it. */
export const DEMO_SESSION_KEY = 'lamid-demo-session';
export const sandboxKey = (profile: DemoProfile, tier: DemoTier) =>
  `lamid-sandbox-v1:${profile}:${tier}`;

export function startDemoSession(profile: DemoProfile, tier: DemoTier) {
  sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify({ profile, tier }));
}

export function readDemoSession(): { profile: DemoProfile; tier: DemoTier } | null {
  try {
    const raw =
      typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(DEMO_SESSION_KEY);
    if (!raw) return null;
    const { profile, tier } = JSON.parse(raw) as { profile: DemoProfile; tier: DemoTier };
    return PROFILES.includes(profile) && TIERS.includes(tier) ? { profile, tier } : null;
  } catch {
    return null;
  }
}

/** Leave the demo: forget the session and send requests to the network again. Each persona's
 * sandbox stays in this tab until it closes, so re-entering resumes where the visitor left off. */
export function endDemoSession() {
  sessionStorage.removeItem(DEMO_SESSION_KEY);
  setApiTransport(null);
}
