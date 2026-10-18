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
    const data = upgradeCommerce(seed());
    storage.setItem(key, JSON.stringify(data));
    return data;
  };
  return {
    read() {
      const raw = storage.getItem(key);
      if (!raw) return fresh();
      try {
        const data = JSON.parse(raw) as SandboxData;
        if (data?.version !== SANDBOX_SCHEMA_VERSION) return fresh();
        if (!data.commerceVersion) {
          upgradeCommerce(data);
          storage.setItem(key, JSON.stringify(data));
        }
        return data;
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

/** Add a contractor example without discarding an existing visitor's saved sample work. */
function upgradeCommerce(data: SandboxData) {
  if (data.commerceVersion) return data;
  const project = data.projects[1] ?? data.projects[0];
  if (project) {
    project.isClient = false;
    project.isFreelancer = true;
    project.freelancer_user_id = data.state.user.id;
    project.milestones.push({
      id: `demo-invoice-${project.id}`,
      project_id: project.id,
      title: 'Approved sample handover',
      description: 'Contractor invoice example; no real payment is due.',
      amount: 1200,
      currency: 'USD',
      status: 'approved',
      deliverables: [],
      submissions: [],
      pendingVerification: null,
    });
  }
  data.commerceVersion = 1;
  return data;
}
