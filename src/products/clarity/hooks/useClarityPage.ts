import { useState } from 'react';
import { useWorkspace } from '../../workspace/components/WorkspaceShell';

export function useClarityPage() {
  const { state, newObjective } = useWorkspace();
  const [filter, setFilter] = useState('All');
  const [selectedId, setSelected] = useState<string | null>(null);
  const selected = state.objectives.find((objective) => objective.id === selectedId);
  return { newObjective, filter, setFilter, state, setSelected, selected };
}
