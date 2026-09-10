import { Check, CheckCircle2, Pause, Play, ShieldCheck, Target } from 'lucide-react';
import { useState } from 'react';
import { dateLabel } from '../../../shared/lib/dateLabel';
import { Button } from '../../../shared/ui/Button';
import { Eyebrow } from '../../../shared/ui/Eyebrow';
import { Modal } from '../../../shared/ui/Modal';
import { StatusPill } from '../../../shared/workspace/StatusPill';
import type { Action, Status } from '../../../types';
import { useWorkspace } from '../../workspace/components/WorkspaceShell';
export function ActionDetail({ action, onClose }: { action: Action; onClose: () => void }) {
  const { state, updateAction } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function move(status: Status, decision?: 'approve' | 'return') {
    setBusy(true);
    try {
      await updateAction(action, status, decision);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={action.title} onClose={onClose}>
      <div className="detail-meta">
        <StatusPill status={action.status} />
        <span>Version {action.version}</span>
      </div>
      <p className="detail-objective">
        <Target size={15} />
        {state.objectives.find((o) => o.id === action.objectiveId)?.title}
      </p>
      <div className="detail-note">
        <Eyebrow>NOTES & ACCEPTANCE CRITERIA</Eyebrow>
        <p>
          {action.notes ||
            'No additional criteria recorded. Review the objective before completing this action.'}
        </p>
      </div>
      <dl className="detail-list">
        <div>
          <dt>Owner</dt>
          <dd>{action.owner}</dd>
        </div>
        <div>
          <dt>Due</dt>
          <dd>{dateLabel(action.dueDate)}</dd>
        </div>
        <div>
          <dt>Review</dt>
          <dd>{action.requiresApproval ? 'Explicit approval required' : 'Owner completion'}</dd>
        </div>
      </dl>
      {action.status === 'Needs review' && (
        <div className="review-callout">
          <ShieldCheck size={19} />
          <p>
            Review the notes and confirm the work meets your expectations. Your decision is recorded
            against version {action.version}.
          </p>
        </div>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="modal-actions action-detail-buttons">
        {action.status === 'Planned' && (
          <Button disabled={busy} onClick={() => void move('In progress')}>
            Start action <Play size={15} />
          </Button>
        )}
        {action.status === 'In progress' && (
          <Button
            disabled={busy}
            onClick={() => void move(action.requiresApproval ? 'Needs review' : 'Done')}
          >
            {action.requiresApproval ? 'Submit for review' : 'Mark complete'}
            <Check size={15} />
          </Button>
        )}
        {action.status === 'Needs review' && state.permissions.includes('review:decide') && (
          <>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void move('In progress', 'return')}
            >
              Return for changes
            </Button>
            <Button disabled={busy} onClick={() => void move('Done', 'approve')}>
              Approve completion <Check size={15} />
            </Button>
          </>
        )}
        {['Planned', 'In progress', 'Needs review'].includes(action.status) && (
          <Button variant="ghost" disabled={busy} onClick={() => void move('Paused')}>
            <Pause size={14} /> Pause
          </Button>
        )}
        {action.status === 'Paused' && (
          <Button disabled={busy} onClick={() => void move('Planned')}>
            Resume planning <Play size={15} />
          </Button>
        )}
        {action.status === 'Done' && (
          <p className="success-note">
            <CheckCircle2 size={18} /> Complete. This action is preserved in your history.
          </p>
        )}
      </div>
    </Modal>
  );
}
