import { CheckCircle2, CircleDashed, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../../api';
import { Button } from '../../../shared/ui/Button';
import { StatusPill } from '../../../shared/workspace/StatusPill';
import type { Milestone, MilestoneFunding, VerificationCase } from '../hooks/useProjectsPage';

const commonCurrencies = ['USD', 'EUR', 'GBP', 'NGN', 'CAD', 'AUD'];

function CurrencyConverter({ amount, currency }: { amount: number; currency: string }) {
  const [target, setTarget] = useState('');
  const [result, setResult] = useState<
    { converted: number; asOf: string | null } | 'unavailable' | null
  >(null);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
      <select
        value={target}
        onChange={async (e) => {
          const to = e.target.value;
          setTarget(to);
          setResult(null);
          if (!to) return;
          try {
            const converted = await api<{ converted: number; asOf: string | null }>(
              `/fx/convert?amount=${amount}&from=${currency}&to=${to}`,
              undefined,
              'GET',
            );
            setResult(converted);
          } catch {
            setResult('unavailable');
          }
        }}
        style={{ fontSize: 9 }}
      >
        <option value="">view in…</option>
        {commonCurrencies
          .filter((c) => c !== currency)
          .map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
      </select>
      {result && (
        <small>
          {result === 'unavailable'
            ? 'No indicative rate available'
            : `≈ ${result.converted} ${target} (indicative)`}
        </small>
      )}
    </span>
  );
}

const criterionIcon = {
  pending: CircleDashed,
  insufficient_evidence: CircleDashed,
  satisfied: CheckCircle2,
  not_satisfied: XCircle,
};

export function MilestoneCard({
  milestone,
  isClient,
  isFreelancer,
  busy,
  onAddDeliverable,
  onSubmit,
  onVerify,
  onDecide,
  onFund,
  onLoadFunding,
  onRelease,
  onRefund,
}: {
  milestone: Milestone;
  isClient: boolean;
  isFreelancer: boolean;
  busy: boolean;
  onAddDeliverable: (title: string, description: string, criteria: string[]) => void;
  onSubmit: (notes: string) => void;
  onVerify: (submissionId: string, consent?: boolean) => Promise<VerificationCase | null>;
  onDecide: (
    verificationCaseId: string,
    decision: 'approve' | 'request_revision' | 'dispute',
    reason: string,
  ) => void;
  onFund?: (milestoneId: string) => void;
  onLoadFunding?: (milestoneId: string) => Promise<MilestoneFunding | null>;
  onRelease?: (milestoneId: string) => void;
  onRefund?: (milestoneId: string) => void;
}) {
  const [deliverableTitle, setDeliverableTitle] = useState('');
  const [criteriaText, setCriteriaText] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [verificationConsent, setVerificationConsent] = useState(false);
  const [lastVerification, setLastVerification] = useState<VerificationCase | null>(null);
  const [funding, setFunding] = useState<MilestoneFunding | null>(null);
  const [invoice, setInvoice] = useState<{ runId: string; response: string } | null>(null);
  const [invoicing, setInvoicing] = useState(false);
  const [invoiceError, setInvoiceError] = useState('');

  useEffect(() => {
    if (onLoadFunding) void onLoadFunding(milestone.id).then(setFunding);
  }, [milestone.id, milestone.status, onLoadFunding]);

  const latestSubmission = milestone.submissions[0];
  // Prefer this browser's own just-completed verify() result (so approving feels instant,
  // no refetch needed); fall back to the server-supplied pending case otherwise — this is what
  // makes Approve/Request revision/Dispute reachable after a reload, a later visit, or from the
  // other party's own session, instead of only right after running verification.
  const verification = lastVerification ?? milestone.pendingVerification;

  async function generateInvoice() {
    setInvoicing(true);
    setInvoiceError('');
    try {
      const result = await api<{ runId: string; response: string }>('/companion/messages', {
        message: `Generate an invoice for the approved milestone "${milestone.title}".`,
        agentId: 'invoice-generator',
        milestoneId: milestone.id,
      });
      setInvoice(result);
    } catch (error) {
      setInvoiceError((error as Error).message);
    } finally {
      setInvoicing(false);
    }
  }

  return (
    <li
      className="activity-feed-row"
      style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}
    >
      <div className="activity-feed-row" style={{ padding: 0, border: 0 }}>
        <span className="activity-feed-title">
          <strong>{milestone.title}</strong>
          <br />
          <small>
            {milestone.amount} {milestone.currency}
            <CurrencyConverter amount={milestone.amount} currency={milestone.currency} />
          </small>
        </span>
        <StatusPill status={milestone.status} />
      </div>

      {milestone.deliverables.map((deliverable) => (
        <div key={deliverable.id} style={{ paddingLeft: 38 }}>
          <strong style={{ fontSize: 10 }}>{deliverable.title}</strong>
          <ul style={{ listStyle: 'none', margin: '6px 0 0', padding: 0 }}>
            {deliverable.criteria.map((criterion) => {
              const Icon = criterionIcon[criterion.status];
              return (
                <li
                  key={criterion.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 9,
                    padding: '4px 0',
                  }}
                >
                  <Icon size={13} />
                  {criterion.criterion}
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {(onFund || onRelease) && (
        <div style={{ paddingLeft: 38, display: 'flex', alignItems: 'center', gap: 8 }}>
          <small>Escrow: </small>
          <StatusPill status={funding?.status ?? 'not funded'} />
          {isClient && onFund && !funding && (
            <Button variant="secondary" disabled={busy} onClick={() => onFund(milestone.id)}>
              Fund milestone
            </Button>
          )}
          {isClient &&
            onRelease &&
            milestone.status === 'approved' &&
            funding?.status === 'held' && (
              <Button disabled={busy} onClick={() => onRelease(milestone.id)}>
                Release payment
              </Button>
            )}
          {isClient &&
            onRefund &&
            milestone.status === 'disputed' &&
            funding?.status === 'held' && (
              <Button variant="ghost" disabled={busy} onClick={() => onRefund(milestone.id)}>
                Request refund
              </Button>
            )}
        </div>
      )}

      {isClient && milestone.status === 'planned' && (
        <div style={{ paddingLeft: 38, display: 'flex', gap: 8 }}>
          <input
            placeholder="Deliverable title"
            value={deliverableTitle}
            onChange={(e) => setDeliverableTitle(e.target.value)}
          />
          <input
            placeholder="Criteria, comma separated"
            value={criteriaText}
            onChange={(e) => setCriteriaText(e.target.value)}
          />
          <Button
            variant="secondary"
            disabled={busy || !deliverableTitle.trim() || !criteriaText.trim()}
            onClick={() => {
              onAddDeliverable(
                deliverableTitle,
                '',
                criteriaText
                  .split(',')
                  .map((c) => c.trim())
                  .filter(Boolean),
              );
              setDeliverableTitle('');
              setCriteriaText('');
            }}
          >
            Add deliverable
          </Button>
        </div>
      )}

      {isFreelancer && ['planned', 'submitted'].includes(milestone.status) && (
        <div style={{ paddingLeft: 38, display: 'flex', gap: 8 }}>
          <input
            placeholder="What did you complete?"
            value={submissionNotes}
            onChange={(e) => setSubmissionNotes(e.target.value)}
          />
          <Button
            disabled={busy || !submissionNotes.trim()}
            onClick={() => {
              onSubmit(submissionNotes);
              setSubmissionNotes('');
            }}
          >
            Submit for review
          </Button>
        </div>
      )}

      {milestone.status === 'submitted' && latestSubmission && (
        <div style={{ paddingLeft: 38 }}>
          <label>
            <input
              type="checkbox"
              checked={verificationConsent}
              onChange={(e) => setVerificationConsent(e.target.checked)}
            />
            Allow external AI to review the submission notes and asset references under workspace AI
            limits.
          </label>
          <p>
            Preliminary review only. Linked files are not inspected; review the deliverables before
            approving.
          </p>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={async () =>
              setLastVerification(await onVerify(latestSubmission.id, verificationConsent))
            }
          >
            Run verification
          </Button>
        </div>
      )}

      {verification && (
        <div style={{ paddingLeft: 38, fontSize: 9 }}>
          <em>
            Preliminary review:{' '}
            {verification.results.filter((r) => r.result === 'satisfied').length}/
            {verification.results.length} criteria satisfied.
          </em>
          <ul>
            {verification.results.map((result) => (
              <li key={result.criterionId}>
                <strong>{result.result.replaceAll('_', ' ')}</strong>: {result.rationale}
              </li>
            ))}
          </ul>
          {isClient && milestone.status === 'in_review' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <Button onClick={() => onDecide(verification.id, 'approve', 'Looks good.')}>
                Approve
              </Button>
              <Button
                variant="secondary"
                onClick={() => onDecide(verification.id, 'request_revision', 'Please revise.')}
              >
                Request revision
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  onDecide(verification.id, 'dispute', 'This does not match what was agreed.')
                }
              >
                Dispute
              </Button>
            </div>
          )}
        </div>
      )}

      {isFreelancer && milestone.status === 'approved' && (
        <div style={{ paddingLeft: 38 }}>
          {!invoice ? (
            <Button variant="secondary" disabled={invoicing} onClick={() => void generateInvoice()}>
              {invoicing ? 'Generating…' : 'Generate invoice'}
            </Button>
          ) : (
            <div className="job-pricing-result">
              <p>{invoice.response}</p>
              <a
                className="button button-secondary"
                href={`/api/agent-runs/${invoice.runId}/pdf`}
                target="_blank"
                rel="noreferrer"
              >
                Download invoice PDF
              </a>
            </div>
          )}
          {invoiceError && (
            <p role="alert" className="form-error">
              {invoiceError}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
