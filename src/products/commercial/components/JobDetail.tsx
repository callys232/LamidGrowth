import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '../../../api';
import { Button } from '../../../shared/ui/Button';
import { Field } from '../../../shared/ui/Field';
import { Modal } from '../../../shared/ui/Modal';
import type { Bid, Job, Proposal } from '../types';
export function JobDetail({
  job,
  owner,
  onClose,
  onSaved,
}: {
  job: Job;
  owner: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [bids, setBids] = useState<Bid[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [bidId, setBidId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
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
  return (
    <Modal title={job.title} onClose={onClose} wide>
      <p>{job.description}</p>
      <h3>Deliverables</h3>
      <p>{job.deliverables}</p>
      <p>
        {job.budget_min}–{job.budget_max} {job.currency} · {job.timeline}
      </p>
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
            Submit bid · 2 points
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
            </article>
          ))}
        </>
      )}
    </Modal>
  );
}
