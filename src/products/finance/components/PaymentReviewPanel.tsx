import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../../../api';
import { useWorkspace } from '../../workspace/components/WorkspaceShell';
type Item = {
  id: string;
  kind: 'funding' | 'transfer';
  payment_status: string;
  amount_minor: number;
  currency: string;
  provider_reference: string | null;
  review_status: string | null;
  note: string | null;
  assigned_to: string | null;
  provider_status: string | null;
  version: number;
};
export function PaymentReviewPanel() {
  const { state } = useWorkspace();
  const [data, setData] = useState<{ operator: boolean; items: Item[] } | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      setData(await api('/finance/payment-reviews', undefined, 'GET'));
      setError('');
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 403)) setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    if (!state.user.demo) void load();
  }, [load, state.user.demo]);
  if (state.user.demo)
    return (
      <section className="panel settings-card">
        <h2>Payment support</h2>
        <p>
          Sample payments never contact a bank or provider. In your account, workspace owners can
          report uncertain payments here; platform operators investigate them.
        </p>
      </section>
    );
  if (!data && !error) return null;
  async function act(item: Item, form: HTMLFormElement, action: 'report' | 'update' | 'verify') {
    const values = new FormData(form),
      note = String(values.get('note') || '').trim();
    if (note.length < 10) {
      setError('Add a note of at least 10 characters so the next person can follow the case.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const path = `/finance/payment-reviews/${item.kind}/${item.id}`;
      if (action === 'report') await api(path + '/report', { note });
      else if (action === 'update')
        await api(
          path,
          { version: Number(item.version), status: values.get('status'), note },
          'PATCH',
        );
      else {
        const refundId = String(values.get('refundId') || '').trim();
        const result = await api<{ message: string }>(path + '/verify', {
          version: Number(item.version),
          operation: values.get('operation'),
          ...(refundId ? { refundId } : {}),
          note,
        });
        setNotice(result.message);
      }
      if (action !== 'verify') setNotice('Case saved. This action did not send money or email.');
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel settings-card" aria-labelledby="payment-review-title">
      <h2 id="payment-review-title">Payment support and reconciliation</h2>
      <p>
        {data?.operator
          ? 'Operator queue across workspaces. Notes are visible to the workspace owner. Save an investigation note, check the provider, then apply only a matching confirmed status.'
          : 'Your workspace’s uncertain payments and support cases. Report the issue here so a platform operator can investigate.'}
      </p>
      <p>
        Keep the payment reference. Avoid another payment while a case is uncertain. Provider checks
        retrieve status; they do not create a transfer or refund. A report is saved in the operator
        queue; it does not contact Paystack or send an email. Pending can be a normal processing
        state; check it before assuming a payment failed.
      </p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <button
        type="button"
        className="button button-secondary"
        onClick={() => void load()}
        disabled={busy}
      >
        Refresh payment cases
      </button>
      {data?.items.length === 0 && <p>No uncertain payments or recorded cases in this view.</p>}
      {data?.items.map((item) => (
        <form
          key={`${item.kind}:${item.id}`}
          className="settings-card"
          onSubmit={(event) => {
            event.preventDefault();
            void act(item, event.currentTarget, data.operator ? 'update' : 'report');
          }}
        >
          <h3>
            {item.kind === 'transfer' ? 'Payout' : 'Milestone funding'} ·{' '}
            {new Intl.NumberFormat('en', { style: 'currency', currency: item.currency }).format(
              item.amount_minor / 100,
            )}
          </h3>
          <p>
            Payment: {item.payment_status}. Case: {item.review_status || 'not reported'}.{' '}
            {item.assigned_to ? 'An investigator has taken responsibility.' : 'Not assigned yet.'}
          </p>
          <p>
            Reference:{' '}
            <code>
              {item.provider_reference || 'Not recorded; do not retry without provider support.'}
            </code>
          </p>
          {item.provider_status && <p>Latest provider check: {item.provider_status}</p>}
          <label>
            Case note (visible to the workspace owner)
            <textarea
              aria-label="Case note (visible to the workspace owner)"
              name="note"
              required
              minLength={10}
              maxLength={2000}
              defaultValue={item.note || ''}
            />
          </label>
          {data.operator ? (
            <>
              <label>
                Case status
                <select aria-label="Case status" name="status" defaultValue={item.review_status || 'investigating'}>
                  <option value="open">Open</option>
                  <option value="investigating">Investigating — assign to me</option>
                  <option value="waiting">Waiting for provider</option>
                  <option value="resolved">Resolved</option>
                </select>
              </label>
              <button type="submit" className="button" disabled={busy}>
                Save investigation
              </button>
              <label>
                Provider check
                <select
                  aria-label="Provider check"
                  name="operation"
                  defaultValue={
                    item.kind === 'transfer'
                      ? 'transfer'
                      : item.payment_status.startsWith('refund')
                        ? 'refund'
                        : 'charge'
                  }
                >
                  {item.kind === 'transfer' ? (
                    <option value="transfer">Payout</option>
                  ) : (
                    <>
                      <option value="charge">Original payment</option>
                      <option value="refund">Refund</option>
                    </>
                  )}
                </select>
              </label>
              <label>
                Provider refund ID (for refund checks)
                <input name="refundId" inputMode="numeric" pattern="[0-9]*" maxLength={30} />
              </label>
              <button
                type="button"
                className="button button-secondary"
                disabled={busy}
                onClick={(e) => void act(item, e.currentTarget.form!, 'verify')}
              >
                Verify provider and reconcile
              </button>
            </>
          ) : (
            <button
              type="submit"
              className="button"
              disabled={busy || Boolean(item.review_status && item.review_status !== 'resolved')}
            >
              Report payment issue
            </button>
          )}
        </form>
      ))}
    </section>
  );
}
