import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, ClipboardList, FileEdit, FileText, ListChecks, NotebookText } from 'lucide-react';
import { api } from '../../../api';
import { Button } from '../../../shared/ui/Button';
import { Field } from '../../../shared/ui/Field';
import { Modal } from '../../../shared/ui/Modal';
import { DocumentCard } from './DocumentCard';
import { ChecklistCard } from './ChecklistCard';
import { ChangeOrderCard } from './ChangeOrderCard';
import type { Bid, Job, Proposal } from '../types';

const documentTools = [
  { agentId: 'scope-builder', label: 'Scope of Work', message: 'draft the scope of work', icon: ClipboardList, kind: 'document' as const },
  { agentId: 'sow-builder', label: 'Statement of Work', message: 'draft a statement of work', icon: FileText, kind: 'document' as const },
  { agentId: 'brief-builder', label: 'Client Brief', message: 'write a client brief', icon: NotebookText, kind: 'document' as const },
  { agentId: 'deliverable-builder', label: 'Deliverables Checklist', message: 'list the deliverables', icon: ListChecks, kind: 'checklist' as const },
  { agentId: 'acceptance-builder', label: 'Acceptance Criteria', message: 'what should the acceptance criteria be?', icon: ListChecks, kind: 'checklist' as const },
] as const;
export function JobDetail({
  job,
  owner,
  bidCost,
  onClose,
  onSaved,
}: {
  job: Job;
  owner: boolean;
  bidCost: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const navigate = useNavigate();
  const [bids, setBids] = useState<Bid[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [bidId, setBidId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [awarding, setAwarding] = useState('');
  const [runningTool, setRunningTool] = useState('');
  const [toolResult, setToolResult] = useState<{
    agentId: string;
    kind: 'calc' | 'document' | 'checklist';
    label: string;
    response: string;
    runId: string;
  } | null>(null);
  const [changeOrder, setChangeOrder] = useState<{ proposalId: string; response: string } | null>(null);
  const [requestingChange, setRequestingChange] = useState('');
  const bidKey = useRef(crypto.randomUUID()),
    proposalKey = useRef(crypto.randomUUID());
  useEffect(() => {
    let active = true;
    if (owner)
      Promise.all([
        api<Bid[]>(`/jobs/${job.id}/bids`),
        api<Proposal[]>(`/jobs/${job.id}/proposals`),
      ])
        .then(([bids, proposals]) => {
          if (active) {
            setBids(bids);
            setProposals(proposals);
          }
        })
        .catch((error: Error) => {
          if (active) setError(error.message);
        });
    else
      api<Array<Bid & { job_id: string }>>('/bids/mine')
        .then(async (bids) => {
          const own = bids.find((bid) => bid.job_id === job.id);
          if (own && active) {
            setBidId(own.id);
            const proposals = await api<Proposal[]>(`/jobs/${job.id}/proposals`);
            if (active) setProposals(proposals);
          }
        })
        .catch((error: Error) => {
          if (active) setError(error.message);
        });
    return () => {
      active = false;
    };
  }, [job.id, owner]);
  async function submit(event: FormEvent<HTMLFormElement>, kind: 'bids' | 'proposals') {
    event.preventDefault();
    setBusy(true);
    setError('');
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await api<{ id: string }>(
        `/jobs/${job.id}/${kind}`,
        kind === 'bids'
          ? { ...data, proposedAmount: Number(data.proposedAmount), currency: job.currency }
          : {
              ...data,
              amount: Number(data.amount),
              currency: job.currency,
              ...(bidId ? { bidId } : {}),
            },
        'POST',
        kind === 'bids' ? bidKey.current : proposalKey.current,
      );
      if (kind === 'bids') setBidId(result.id);
      else {
        setProposals(await api<Proposal[]>(`/jobs/${job.id}/proposals`));
        proposalKey.current = crypto.randomUUID();
      }
      setMessage(
        kind === 'bids'
          ? 'Bid submitted. You can now prepare a proposal draft.'
          : 'Proposal draft saved.',
      );
      onSaved();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function award(proposal: Proposal) {
    setAwarding(proposal.id);
    setError('');
    try {
      const project = await api<{ id: string }>('/projects', {
        jobId: job.id,
        freelancerUserId: proposal.author_user_id,
        title: proposal.title,
      });
      navigate(`/os/commercial/projects/${project.id}`);
    } catch (error) {
      setError((error as Error).message);
      setAwarding('');
    }
  }
  async function runTool(agentId: string, label: string, message: string, kind: 'calc' | 'document' | 'checklist') {
    setRunningTool(agentId);
    setToolResult(null);
    setError('');
    try {
      const result = await api<{ runId: string; response: string }>('/companion/messages', {
        message,
        agentId,
        jobId: job.id,
      });
      setToolResult({ agentId, kind, label, response: result.response, runId: result.runId });
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setRunningTool('');
    }
  }
  async function requestChangeOrder(proposal: Proposal, change: string) {
    setRequestingChange(proposal.id);
    setError('');
    try {
      const result = await api<{ response: string }>('/companion/messages', {
        message: change,
        agentId: 'change-order',
        proposalId: proposal.id,
      });
      setChangeOrder({ proposalId: proposal.id, response: result.response });
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setRequestingChange('');
    }
  }
  return (
    <Modal title={job.title} onClose={onClose} wide>
      <p>{job.description}</p>
      <h3>Deliverables</h3>
      <p>{job.deliverables}</p>
      <p>
        {job.budget_min}–{job.budget_max} {job.currency} · {job.timeline}
      </p>
      <h3>Document tools</h3>
      <div className="job-pricing-tools">
        <Button
          variant="secondary"
          disabled={Boolean(runningTool)}
          onClick={() => void runTool('quote-generator', 'Quote', 'generate a quote', 'calc')}
        >
          <Calculator size={14} /> {runningTool === 'quote-generator' ? 'Computing…' : 'Get a quote'}
        </Button>
        <Button
          variant="secondary"
          disabled={Boolean(runningTool)}
          onClick={() => void runTool('estimate-generator', 'Estimate', 'give me an estimate', 'calc')}
        >
          <Calculator size={14} /> {runningTool === 'estimate-generator' ? 'Computing…' : 'Get a budget estimate'}
        </Button>
        {documentTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Button
              key={tool.agentId}
              variant="secondary"
              disabled={Boolean(runningTool)}
              onClick={() => void runTool(tool.agentId, tool.label, tool.message, tool.kind)}
            >
              <Icon size={14} /> {runningTool === tool.agentId ? 'Working…' : tool.label}
            </Button>
          );
        })}
      </div>
      {toolResult &&
        (toolResult.kind === 'document' ? (
          <DocumentCard
            icon={documentTools.find((t) => t.agentId === toolResult.agentId)?.icon || FileText}
            kind={toolResult.label}
            text={toolResult.response}
            runId={toolResult.runId}
          />
        ) : toolResult.kind === 'checklist' ? (
          <ChecklistCard kind={toolResult.label} text={toolResult.response} runId={toolResult.runId} />
        ) : (
          <div className="job-pricing-result">
            <p>{toolResult.response}</p>
            <a
              className="button button-secondary"
              href={`/api/agent-runs/${toolResult.runId}/pdf`}
              target="_blank"
              rel="noreferrer"
            >
              Download PDF
            </a>
          </div>
        ))}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {owner && (
        <>
          <h3>Submitted bids</h3>
          {bids.length ? (
            bids.map((bid) => (
              <article key={bid.id}>
                <p>{bid.cover_letter}</p>
                <p>
                  {bid.proposed_amount} {bid.currency} · {bid.timeline}
                </p>
                <Button variant="secondary" onClick={() => setBidId(bid.id)}>
                  {bidId === bid.id ? 'Selected for proposal' : 'Use this bid in a proposal'}
                </Button>
              </article>
            ))
          ) : (
            <p>No bids submitted yet.</p>
          )}
        </>
      )}
      {!owner && !bidId && (
        <form
          onSubmit={(e) => void submit(e, 'bids')}
          onChange={() => {
            bidKey.current = crypto.randomUUID();
          }}
        >
          <h3>Submit a bid</h3>
          <Field label="Cover letter">
            <textarea name="coverLetter" required minLength={20} maxLength={10000} />
          </Field>
          <Field label={`Proposed amount (${job.currency})`}>
            <input name="proposedAmount" type="number" required min={1} max={100000000} />
          </Field>
          <Field label="Bid timeline">
            <input name="timeline" required maxLength={200} />
          </Field>
          <Button type="submit" disabled={busy}>
            Submit bid · {bidCost} points
          </Button>
        </form>
      )}
      {(owner || bidId) && (
        <details open={Boolean(bidId)}>
          <summary>Prepare proposal draft</summary>
          <form
            onSubmit={(e) => void submit(e, 'proposals')}
            onChange={() => {
              proposalKey.current = crypto.randomUUID();
            }}
          >
            <Field label="Proposal title">
              <input name="title" required maxLength={200} />
            </Field>
            <Field label="Scope">
              <textarea name="scope" required minLength={20} maxLength={10000} />
            </Field>
            <Field label="Proposal deliverables">
              <textarea name="deliverables" required maxLength={5000} />
            </Field>
            <Field label={`Proposal amount (${job.currency})`}>
              <input name="amount" type="number" min={1} max={100000000} required />
            </Field>
            <Field label="Proposal timeline">
              <input name="timeline" required maxLength={200} />
            </Field>
            <Button type="submit" disabled={busy}>
              Save proposal draft
            </Button>
          </form>
        </details>
      )}
      {proposals.length > 0 && (
        <>
          <h3>Proposal drafts</h3>
          {proposals.map((p) => (
            <article key={p.id}>
              <h4>{p.title}</h4>
              <p>{p.scope}</p>
              <p>{p.deliverables}</p>
              <p>
                {p.amount} {p.currency} · {p.status}
              </p>
              {owner && p.author_user_id !== job.client_user_id && (
                <Button disabled={Boolean(awarding)} onClick={() => void award(p)}>
                  {awarding === p.id ? 'Starting project…' : 'Award & start project'}
                </Button>
              )}
              <form
                className="job-changeorder-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const change = new FormData(e.currentTarget).get('change');
                  if (typeof change === 'string' && change.trim()) void requestChangeOrder(p, change);
                }}
              >
                <Field label="Request a change to this proposal">
                  <input name="change" required minLength={5} maxLength={2000} placeholder="e.g. Add a second revision round" />
                </Field>
                <Button type="submit" variant="secondary" disabled={requestingChange === p.id}>
                  <FileEdit size={14} /> {requestingChange === p.id ? 'Drafting…' : 'Draft change order'}
                </Button>
              </form>
              {changeOrder?.proposalId === p.id && (
                <ChangeOrderCard originalScope={p.scope} originalAmount={p.amount} currency={p.currency} text={changeOrder.response} />
              )}
            </article>
          ))}
        </>
      )}
    </Modal>
  );
}
