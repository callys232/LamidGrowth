import { useWorkspace } from '../components/WorkspaceShell';

export function useDashboardPage() {
  const { state, newObjective, newAction } = useWorkspace();
  const pending = state.actions.filter((a) => a.status === 'Needs review');
  const done = state.actions.filter((a) => a.status === 'Done').length;
  const active = state.objectives.filter((o) => o.status === 'Active');
  const next = state.actions.filter((a) => a.status !== 'Done' && a.status !== 'Paused');
  return { state, newObjective, active, pending, done, newAction, next };
}
