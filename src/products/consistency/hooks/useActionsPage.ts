import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  const [params, setParams] = useSearchParams();
  const objectiveId = params.get('objective') || '';
  const [filter, setFilter] = useState('All');
  const [view, setView] = useState<'list' | 'board'>(workflows ? 'board' : 'list');
  const [selectedId, setSelected] = useState<string | null>(null);
  const selected = state.actions.find((action) => action.id === selectedId);
  const currentDate = new Date().toLocaleDateString('en-CA');
  const actions = state.actions
    .filter(
      (a) =>
        (!objectiveId || a.objectiveId === objectiveId) &&
        (!today ||
          a.status === 'Needs review' ||
          (a.status !== 'Done' &&
            a.status !== 'Paused' &&
            a.dueDate &&
            a.dueDate <= currentDate)) &&
        (filter === 'All' || a.status === filter),
    )
    .sort((a, b) =>
      objectiveId
        ? (a.pathwayOrder ?? Number.MAX_SAFE_INTEGER) - (b.pathwayOrder ?? Number.MAX_SAFE_INTEGER)
        : 0,
    );
  const statuses: Status[] = ['Planned', 'In progress', 'Needs review', 'Done', 'Paused'];
  return {
    today,
    workflows,
    newAction: () => newAction(objectiveId || undefined),
    filter,
    setFilter,
    statuses,
    setView,
    view,
    actions,
    setSelected,
    state,
    selected,
    objectiveId,
    setObjectiveId: (id: string) =>
      setParams((previous) => {
        const updated = new URLSearchParams(previous);
        if (id) updated.set('objective', id);
        else updated.delete('objective');
        return updated;
      }),
  };
}
