import { useState } from 'react';
import type { Status } from '../../../types';
import { useWorkspace } from '../../workspace/components/WorkspaceShell';

export function useActionsPage({
  today = false,
  workflows = false,
}: {
  today?: boolean;
  workflows?: boolean;
}) {
  const { state, newAction } = useWorkspace();
  const [filter, setFilter] = useState('All');
  const [view, setView] = useState<'list' | 'board'>(workflows ? 'board' : 'list');
  const [selectedId, setSelected] = useState<string | null>(null);
  const selected = state.actions.find((action) => action.id === selectedId);
  const currentDate = new Date().toLocaleDateString('en-CA');
  const actions = state.actions.filter(
    (a) =>
      (!today ||
        a.status === 'Needs review' ||
        (a.status !== 'Done' && a.status !== 'Paused' && a.dueDate && a.dueDate <= currentDate)) &&
      (filter === 'All' || a.status === filter),
  );
  const statuses: Status[] = ['Planned', 'In progress', 'Needs review', 'Done', 'Paused'];
  return {
    today,
    workflows,
    newAction,
    filter,
    setFilter,
    statuses,
    setView,
    view,
    actions,
    setSelected,
    state,
    selected,
  };
}
