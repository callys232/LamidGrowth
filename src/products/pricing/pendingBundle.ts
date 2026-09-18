/** Handoff for an anonymous visitor's self-built bundle (see the public /pricing page's "Create a
 * Bundle" tool) across the sign-up wall: the visitor picks tools with no account yet, so there is
 * nowhere server-side to persist the selection. It's stashed here just long enough for the
 * authenticated /os/pricing page to read it once, prefill the points purchase, and clear it —
 * never sent to the server as-is, never trusted as anything but a UI convenience. */
export const PENDING_BUNDLE_KEY = 'lamid_pending_bundle';

export type PendingBundle = {
  toolNames: string[];
  extraPoints: number;
  totalPoints: number;
  billingCycle: 'one_time' | 'monthly';
};

export function readPendingBundle(): PendingBundle | null {
  try {
    const raw = sessionStorage.getItem(PENDING_BUNDLE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      !Array.isArray(parsed.toolNames) ||
      typeof parsed.totalPoints !== 'number' ||
      typeof parsed.extraPoints !== 'number'
    )
      return null;
    return parsed as PendingBundle;
  } catch {
    return null;
  }
}

export function writePendingBundle(bundle: PendingBundle) {
  try {
    sessionStorage.setItem(PENDING_BUNDLE_KEY, JSON.stringify(bundle));
  } catch {
    // Private browsing / storage disabled — the visitor just re-picks tools after signing in.
  }
}

export function clearPendingBundle() {
  try {
    sessionStorage.removeItem(PENDING_BUNDLE_KEY);
  } catch {
    // Nothing to clean up if storage was never writable.
  }
}
