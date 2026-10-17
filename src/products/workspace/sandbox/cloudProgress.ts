import { ApiError, networkApi } from '../../../api';
import type { DemoProfile, DemoTier } from '../demo/personaList';
import { demoIdentity, trackDemo } from './demoAccess';
import type { SandboxStore } from './store';
import { SANDBOX_SCHEMA_VERSION, type SandboxData } from './types';

export type DemoSaveStatus = { state: 'saving' | 'saved' | 'error'; message: string };
let retrySave: (() => Promise<void>) | null = null;
let loadLatest: (() => void) | null = null;
let lastStatus: DemoSaveStatus = { state: 'saved', message: 'Demo progress saved' };
export function demoSaveStatus() {
  return lastStatus;
}
export function retryDemoSave() {
  return retrySave?.();
}
export function loadLatestDemo() {
  loadLatest?.();
}
function status(value: DemoSaveStatus) {
  lastStatus = value;
  window.dispatchEvent(new CustomEvent('demo-save-status', { detail: value }));
}

/** Optimistic revision checks prevent two devices from silently overwriting each other. */
export async function connectDemoProgress(
  profile: DemoProfile,
  tier: DemoTier,
  key: string,
  store: SandboxStore,
) {
  const identity = demoIdentity();
  if (!identity) throw new Error('Open your personal demo link to continue.');
  const request = <T>(path: string, body: Record<string, unknown>) =>
    networkApi<T>(`/demo/${path}`, { ...body, token: identity.token });
  let revision = 0;
  let blocked = false;
  let cached: { revision: number; dirty: boolean } | null = null;
  try {
    cached = JSON.parse(sessionStorage.getItem(`${key}:sync`) || 'null');
  } catch {
    /* use server snapshot */
  }
  const remote = await request<{ data: SandboxData | null; revision: number }>('progress/read', {
    profile,
    tier,
  });
  revision = remote.revision;
  const unsaved = cached?.dirty && sessionStorage.getItem(key);
  const needsInitialSave =
    !remote.data || remote.data.version !== SANDBOX_SCHEMA_VERSION || Boolean(unsaved);
  if (unsaved) {
    revision = cached!.revision;
    blocked = revision !== remote.revision;
  } else if (remote.data?.version === SANDBOX_SCHEMA_VERSION)
    sessionStorage.setItem(key, JSON.stringify(remote.data));
  else if (remote.data) sessionStorage.removeItem(key);
  loadLatest = () => {
    sessionStorage.setItem(`${key}:sync`, JSON.stringify({ revision, dirty: false }));
    window.location.reload();
  };
  if (blocked)
    status({
      state: 'error',
      message:
        'Another device changed this demo. Reloading the latest demo replaces this tab’s unsaved changes.',
    });
  else if (!needsInitialSave) status({ state: 'saved', message: 'Demo progress saved' });
  let pending = false;
  let running: Promise<void> | null = null;
  const flush = (): Promise<void> => {
    pending = true;
    if (running) return running;
    running = (async () => {
      while (pending && !blocked) {
        pending = false;
        status({ state: 'saving', message: 'Saving demo progress…' });
        sessionStorage.setItem(`${key}:sync`, JSON.stringify({ revision, dirty: true }));
        try {
          const saved = await request<{ revision: number }>('progress/save', {
            profile,
            tier,
            revision,
            data: store.read(),
          });
          revision = saved.revision;
          sessionStorage.setItem(`${key}:sync`, JSON.stringify({ revision, dirty: pending }));
          status({ state: 'saved', message: 'Demo progress saved' });
        } catch (error) {
          blocked = error instanceof ApiError && error.status === 409;
          void trackDemo(
            blocked ? 'save_conflict' : 'save_failed',
            window.location.pathname,
            profile,
            tier,
          );
          status({
            state: 'error',
            message: blocked
              ? 'Another device changed this demo. Reloading the latest demo replaces this tab’s unsaved changes.'
              : 'Progress is saved in this tab. Retry to save it across devices.',
          });
          pending = false;
          break;
        }
      }
    })().finally(() => {
      running = null;
    });
    return running;
  };
  retrySave = blocked ? null : flush;
  return { flush, needsInitialSave, canWrite: () => !blocked };
}
