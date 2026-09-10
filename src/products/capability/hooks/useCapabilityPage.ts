import { useWorkspace } from '../../workspace/components/WorkspaceShell';

export function useCapabilityPage() {
  const { state, newAction } = useWorkspace();
  return { state, newAction };
}
