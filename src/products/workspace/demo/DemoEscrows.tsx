import { useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import { Field } from '../../../shared/ui/Field';
import { Modal } from '../../../shared/ui/Modal';
import type { DemoEscrow, DemoWorkspace } from './scenarios';

type Transition =
  'fund' | 'submit' | 'verify' | 'approve' | 'revision' | 'dispute' | 'release' | 'refund';
export function escrowTransition(
  escrow: DemoEscrow,
  action: Transition,
  role: 'client' | 'freelancer',
): DemoEscrow {
  const next = { ...escrow };
  const client = role === 'client';
  if (action === 'fund' && client && escrow.status === 'pending') next.status = 'held';
  else if (
    action === 'submit' &&
    !client &&
    escrow.status === 'held' &&
    escrow.delivery === 'pending'
  )
    next.delivery = 'submitted';
  else if (
    action === 'verify' &&
    client &&
    escrow.status === 'held' &&
    escrow.delivery === 'submitted'
  )
    next.delivery = 'in_review';
  else if (
    ['approve', 'revision', 'dispute'].includes(action) &&
    client &&
    escrow.status === 'held' &&
    escrow.delivery === 'in_review'
  )
    next.delivery =
      action === 'approve' ? 'approved' : action === 'dispute' ? 'disputed' : 'pending';
  else if (
    action === 'release' &&
    client &&
    escrow.status === 'held' &&
    escrow.delivery === 'approved'
  )
    next.status = 'released';
  else if (
    action === 'refund' &&
    client &&
    escrow.status === 'held' &&
    escrow.delivery === 'disputed'
  )
    next.status = 'refunded';
  else throw new Error('This action is not available for the current role or milestone state.');
  return {
    ...next,
    history: [
      {
        id: crypto.randomUUID(),
        detail: `Simulated ${action} by ${role}.`,
        at: new Date().toISOString(),
      },
      ...escrow.history,
    ],
  };
}
const money = (amount: number, currency: string) =>
  new Intl.NumberFormat('en', { style: 'currency', currency }).format(amount / 100);
export function DemoEscrows({
  state,
  change,
}: {
  state: DemoWorkspace;
  change: (update: (sample: DemoWorkspace) => DemoWorkspace, message: string) => void;
}) {
  const [role, setRole] = useState<'client' | 'freelancer'>('client');
  const [adding, setAdding] = useState(false);
  const [projectId, setProjectId] = useState(state.projects[0]?.id ?? '');
  const [confirmation, setConfirmation] = useState<{ id: string; action: Transition } | null>(null);
  const [error, setError] = useState('');
  const project = state.projects.find((p) => p.id === projectId);
  const available =
    project?.milestones.filter((m) => !state.escrows.some((e) => e.milestoneId === m.id)) ?? [];
  function transition(id: string, action: Transition) {
    const current = state.escrows.find((e) => e.id === id);
    if (!current) return;
    try {
      escrowTransition(current, action, role);
      change(
        (s) => ({
          ...s,
          escrows: s.escrows.map((e) => (e.id === id ? escrowTransition(e, action, role) : e)),
        }),
        `Escrow ${action} simulated. No money moved.`,
      );
      setError('');
      setConfirmation(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section>
      <div className="marketing-demo-heading">
        <div>
          <h2>Escrows</h2>
          <p>
            Simulated milestone funding, delivery review, release, and dispute refunds. No payments
            or transfers occur.
          </p>
        </div>
        <Button
          disabled={!state.projects.length}
          onClick={() => {
            setProjectId(state.projects[0]?.id ?? '');
            setAdding(true);
          }}
        >
          Create sample escrow
        </Button>
      </div>
      <Field label="Demonstrate as">
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value as typeof role);
            setConfirmation(null);
          }}
        >
          <option value="client">Client / project owner</option>
          <option value="freelancer">Freelancer / delivery partner</option>
        </select>
      </Field>
      <div className="marketing-demo-stats">
        {(['pending', 'held', 'released', 'refunded'] as const).map((status) => (
          <article key={status}>
            <strong>{state.escrows.filter((e) => e.status === status).length}</strong>
            <span>{status[0].toUpperCase() + status.slice(1)} milestones</span>
            {['USD', 'NGN'].map((currency) => {
              const items = state.escrows.filter(
                (e) => e.status === status && e.currency === currency,
              );
              return items.length ? (
                <small key={currency}>
                  {money(
                    items.reduce((sum, e) => sum + e.amountMinor, 0),
                    currency,
                  )}
                </small>
              ) : null;
            })}
          </article>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="marketing-demo-grid">
        {state.escrows.map((escrow) => (
          <article key={escrow.id} className="marketing-demo-panel demo-escrow-card">
            <span className={`demo-escrow-status is-${escrow.status}`}>{escrow.status}</span>
            <h3>{escrow.milestoneTitle}</h3>
            <p>
              {state.projects.find((p) => p.id === escrow.projectId)?.title ??
                `${escrow.projectTitle} (project removed)`}
            </p>
            <strong className="demo-escrow-amount">
              {money(escrow.amountMinor, escrow.currency)}
            </strong>
            <p>Delivery: {escrow.delivery.replace('_', ' ')}</p>
            <div className="marketing-demo-actions">
              {role === 'client' && escrow.status === 'pending' && (
                <Button onClick={() => setConfirmation({ id: escrow.id, action: 'fund' })}>
                  Simulate funding
                </Button>
              )}
              {role === 'freelancer' &&
                escrow.status === 'held' &&
                escrow.delivery === 'pending' && (
                  <Button onClick={() => transition(escrow.id, 'submit')}>
                    Submit sample deliverable
                  </Button>
                )}
              {role === 'client' && escrow.status === 'held' && escrow.delivery === 'submitted' && (
                <Button onClick={() => transition(escrow.id, 'verify')}>
                  Simulate evidence verification
                </Button>
              )}
              {role === 'client' && escrow.status === 'held' && escrow.delivery === 'in_review' && (
                <>
                  <Button onClick={() => transition(escrow.id, 'approve')}>
                    Approve milestone
                  </Button>
                  <Button variant="secondary" onClick={() => transition(escrow.id, 'revision')}>
                    Request revision
                  </Button>
                  <Button variant="ghost" onClick={() => transition(escrow.id, 'dispute')}>
                    Dispute milestone
                  </Button>
                </>
              )}
              {role === 'client' && escrow.status === 'held' && escrow.delivery === 'approved' && (
                <Button onClick={() => setConfirmation({ id: escrow.id, action: 'release' })}>
                  Simulate release
                </Button>
              )}
              {role === 'client' && escrow.status === 'held' && escrow.delivery === 'disputed' && (
                <Button onClick={() => setConfirmation({ id: escrow.id, action: 'refund' })}>
                  Simulate refund
                </Button>
              )}
            </div>
            <details>
              <summary>Sample activity history</summary>
              <ul>
                {escrow.history.map((event) => (
                  <li key={event.id}>{event.detail}</li>
                ))}
              </ul>
            </details>
          </article>
        ))}
      </div>
      {!state.escrows.length && (
        <p>Create an escrow for a project milestone to start the demonstration.</p>
      )}
      {confirmation && (
        <Modal title={`Simulate ${confirmation.action}?`} onClose={() => setConfirmation(null)}>
          <p>
            This updates sample funding records only. Live funding, release and refund confirmations
            depend on the payment provider.
          </p>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setConfirmation(null)}>
              Cancel
            </Button>
            <Button onClick={() => transition(confirmation.id, confirmation.action)}>
              Confirm simulation
            </Button>
          </div>
        </Modal>
      )}
      {adding && (
        <Modal title="Create sample escrow" onClose={() => setAdding(false)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const data = Object.fromEntries(new FormData(event.currentTarget));
              const milestone = available.find((m) => m.id === data.milestoneId);
              const amountMinor = Math.round(Number(data.amount) * 100);
              if (
                !project ||
                !milestone ||
                !Number.isSafeInteger(amountMinor) ||
                amountMinor <= 0
              ) {
                setError('Choose an available milestone and a positive amount.');
                return;
              }
              const escrow: DemoEscrow = {
                id: crypto.randomUUID(),
                projectId: project.id,
                projectTitle: project.title,
                milestoneId: milestone.id,
                milestoneTitle: milestone.title,
                amountMinor,
                currency: data.currency as DemoEscrow['currency'],
                status: 'pending',
                delivery: 'pending',
                history: [
                  {
                    id: crypto.randomUUID(),
                    detail: 'Sample escrow created; awaiting simulated funding.',
                    at: new Date().toISOString(),
                  },
                ],
              };
              change((s) => ({ ...s, escrows: [...s.escrows, escrow] }), 'Sample escrow created.');
              setAdding(false);
              setError('');
            }}
          >
            <Field label="Project">
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                {state.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Milestone">
              <select key={projectId} name="milestoneId" required disabled={!available.length}>
                {available.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </Field>
            {!available.length && (
              <p>
                All milestones in this project already have escrows. Add a project or a new
                milestone first.
              </p>
            )}
            <Field label="Amount">
              <input name="amount" type="number" required min="0.01" max="100000000" step="0.01" />
            </Field>
            <Field label="Currency">
              <select name="currency">
                <option>USD</option>
                <option>NGN</option>
              </select>
            </Field>
            <div className="modal-actions">
              <Button variant="secondary" onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!available.length}>
                Create escrow
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
