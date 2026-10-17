import { ApiError } from '../../../../api';
import type { Action, Objective, Status } from '../../../../types';
import type { Policy } from '../../../intelligence/types';
import type { ActivityItem } from '../../hooks/useActivityFeed';
import type { SandboxRoute } from '../router';
import type { SandboxStore } from '../store';

const newId = (kind: string) => `sandbox-${kind}-${crypto.randomUUID()}`;
const now = () => new Date().toISOString();

function record(store: SandboxStore, type: ActivityItem['type'], title: string, status: string) {
  const data = store.read();
  data.activity.unshift({ id: newId('activity'), type, title, status, createdAt: now() });
  return data;
}

/** AI never runs in the demo: the briefing panel shows its existing "disabled" state. */
const DEMO_POLICY: Policy = {
  rules: {
    pathways: false,
    reviews: false,
    specialists: false,
    documents: false,
    deliverableReviews: false,
    workflowCommands: false,
    humanHandoffs: false,
    allowedSources: [],
    maxPointsPerRequest: 0,
    instructions: '',
    changes: {
      'action.prepare': 'block',
      'progress.snapshot': 'block',
      'review.reminder': 'block',
      'capability.run': 'block',
    },
  },
  configured: true,
  enabled: false,
  dailyLimit: 0,
  version: 1,
  provider: null,
  model: null,
  reviewCost: 0,
  accountEligible: false,
};

/** Shell, dashboard, goals and actions — mirroring the server's validation outcomes and copy. */
export const workspaceRoutes: SandboxRoute[] = [
  { method: 'GET', pattern: '/state', handler: ({ store }) => store.read().state },
  { method: 'GET', pattern: '/activity', handler: ({ store }) => store.read().activity },
  { method: 'GET', pattern: '/ai/settings', handler: () => DEMO_POLICY },
  { method: 'POST', pattern: '/workspace/switch', handler: () => ({ ok: true }) },
  { method: 'POST', pattern: '/auth/logout', handler: () => ({ ok: true }) },
  {
    method: 'POST',
    pattern: '/objectives',
    handler: ({ store, body }) => {
      const input = { ...(body as Omit<Objective, 'id' | 'version' | 'createdAt'>) };
      input.status ??= 'Active';
      if (input.status === 'Complete')
        throw new ApiError(
          'Create an active or paused objective, then review its completion.',
          400,
        );
      const data = record(store, 'objective', input.title, input.status);
      const created: Objective = { ...input, id: newId('objective'), version: 1, createdAt: now() };
      data.state.objectives.unshift(created);
      store.write(data);
      return created;
    },
  },
  {
    method: 'PATCH',
    pattern: '/objectives/:id',
    handler: ({ store, params, body }) => {
      const input = body as Partial<Objective> & { version: number };
      const data = store.read();
      const index = data.state.objectives.findIndex((o) => o.id === params.id);
      if (index < 0) throw new ApiError('Objective not found.', 404);
      const current = data.state.objectives[index];
      if (current.version !== input.version)
        throw new ApiError('This objective changed. Reopen it to review the latest version.', 409);
      const updated: Objective = {
        ...current,
        ...input,
        id: current.id,
        version: current.version + 1,
      };
      data.state.objectives[index] = updated;
      data.activity.unshift({
        id: newId('activity'),
        type: 'objective',
        title: updated.title,
        status: updated.status,
        createdAt: now(),
      });
      store.write(data);
      return updated;
    },
  },
  {
    method: 'POST',
    pattern: '/actions',
    handler: ({ store, body }) => {
      const input = { ...(body as Omit<Action, 'id' | 'version' | 'createdAt'>) };
      input.status ??= 'Planned';
      if (input.status !== 'Planned') throw new ApiError('New actions must start as Planned.', 400);
      const data = record(store, 'action', input.title, input.status);
      const goal = data.state.objectives.find((o) => o.id === input.objectiveId);
      if (!goal) throw new ApiError('Objective not found.', 404);
      if (goal.status === 'Complete')
        throw new ApiError('Reopen this objective before adding actions.', 409);
      const created: Action = { ...input, id: newId('action'), version: 1, createdAt: now() };
      data.state.actions.unshift(created);
      store.write(data);
      return created;
    },
  },
  {
    method: 'PATCH',
    pattern: '/actions/:id',
    handler: ({ store, params, body }) => {
      const input = body as { version: number; status: Status };
      const data = store.read();
      const index = data.state.actions.findIndex((a) => a.id === params.id);
      if (index < 0) throw new ApiError('Action not found.', 404);
      const current = data.state.actions[index];
      if (current.version !== input.version)
        throw new ApiError('This action changed. Refresh and review the latest version.', 409);
      const updated: Action = { ...current, status: input.status, version: current.version + 1 };
      data.state.actions[index] = updated;
      data.activity.unshift({
        id: newId('activity'),
        type: 'action',
        title: updated.title,
        status: updated.status,
        createdAt: now(),
      });
      store.write(data);
      return updated;
    },
  },
  {
    method: 'POST',
    pattern: '/dashboard/briefing',
    handler: () => {
      throw new ApiError('Not available in the demo.', 501);
    },
  },
];
