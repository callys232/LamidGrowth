import { SANDBOX_SCHEMA_VERSION, type SandboxData } from './types';

export interface SandboxStore {
  read(): SandboxData;
  write(next: SandboxData): void;
  reset(): void;
}

/** One persona's sandbox, persisted under `key` for this browser session. Missing, unreadable
 * or older-schema data is replaced with a fresh seed instead of breaking the workspace. */
export function createSessionStore(
  key: string,
  seed: () => SandboxData,
  storage: Storage = sessionStorage,
): SandboxStore {
  const fresh = () => {
    const data = seed();
    storage.setItem(key, JSON.stringify(data));
    return data;
  };
  return {
    read() {
      const raw = storage.getItem(key);
      if (!raw) return fresh();
      try {
        const data = JSON.parse(raw) as SandboxData;
        return data?.version === SANDBOX_SCHEMA_VERSION ? data : fresh();
      } catch {
        return fresh();
      }
    },
    write(next) {
      storage.setItem(key, JSON.stringify(next));
    },
    reset() {
      fresh();
    },
  };
}
