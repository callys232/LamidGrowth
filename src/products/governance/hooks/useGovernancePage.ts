import { useState } from 'react';
import { useWorkspace } from '../../workspace/components/WorkspaceShell';

export function useGovernancePage() {
  const { state } = useWorkspace();
  const [filter, setFilter] = useState('');
  const pending = state.actions.filter((a) => a.status === 'Needs review');
  return { state, pending, filter, setFilter };
}
