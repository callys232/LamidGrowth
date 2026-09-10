import { Check, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { dateLabel } from '../../../shared/lib/dateLabel';
import { StatusPill } from '../../../shared/workspace/StatusPill';
import type { Action } from '../../../types';
import { useWorkspace } from '../../workspace/components/WorkspaceShell';
import { ActionDetail } from './ActionDetail';
export function ActionRow({ action }: { action: Action }) {
  const { state } = useWorkspace();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="action-row"
        data-active={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <span className={`action-check ${action.status === 'Done' ? 'complete' : ''}`}>
          {action.status === 'Done' ? (
            <Check size={13} />
          ) : action.status === 'In progress' ? (
            <span />
          ) : null}
        </span>
        <span className="action-row-title">
          <strong>{action.title}</strong>
          <small>{state.objectives.find((o) => o.id === action.objectiveId)?.title}</small>
        </span>
        <StatusPill status={action.status} />
        <span className="action-date">{dateLabel(action.dueDate)}</span>
        <ChevronRight size={15} />
      </button>
      {open && <ActionDetail action={action} onClose={() => setOpen(false)} />}
    </>
  );
}
