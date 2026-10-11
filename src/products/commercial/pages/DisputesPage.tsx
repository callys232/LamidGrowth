import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../../api';
import { Button } from '../../../shared/ui/Button';
import { Field } from '../../../shared/ui/Field';
import { isOpenDispute } from '../../../shared/workspace/disputeStatus';
import { PageHeader } from '../../../shared/workspace/ui/PageHeader';
import { StatusPill } from '../../../shared/workspace/ui/StatusPill';
import { useWorkspace } from '../../workspace/components/WorkspaceShell';
import { notifyActivityChanged } from '../../workspace/hooks/useWorkspaceActivity';
import {
  disputeKpis,
  disputeState,
  disputeTimeline,
  OUTCOME_LABEL,
  type Dispute,
} from '../disputes/disputeModel';

export type { Dispute } from '../disputes/disputeModel';

const STATE_PILL = {
  awaiting: { tone: 'opportunities', label: 'Needs your answer' },
  proposed: { tone: 'neutral', label: 'Your proposal is pending' },
  open: { tone: 'risk', label: 'Open' },
  resolved: { tone: 'money', label: 'Resolved' },
} as const;
const when = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(
        new Date(iso),
      )
    : '';

function ProposalForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="ws-dispute-form" onSubmit={onSubmit}>
      <Field label="Resolution">
        <select name="outcome">
          <option value="revision">Request revised work</option>
          <option value="refund">Agree to a refund</option>
          <option value="release">Accept work for payment</option>
        </select>
      </Field>
      <Field label="Terms of your proposal">
        <textarea name="note" required maxLength={4000} rows={3} />
      </Field>
      <Button type="submit" disabled={busy}>
        Propose resolution
      </Button>
    </form>
  );
}

function DisputeCard({
  item,
  userId,
  busy,
  act,
}: {
  item: Dispute;
  userId: string;
  busy: boolean;
  act: (path: string, body: unknown) => Promise<void>;
}) {
  const state = disputeState(item, userId);
  const [revising, setRevising] = useState(false);
  const pill = STATE_PILL[state];
  const propose = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    void act(`/disputes/${item.id}/resolution`, body).then(() => setRevising(false));
  };
  const respond = (decision: 'accept' | 'reject') =>
    void act(`/disputes/${item.id}/respond`, { decision, version: item.resolution!.version });
  return (
    <li className="ws-dispute" data-state={state}>
      <header>
        <div>
          <h3>{item.milestone_title}</h3>
          <Link to={`/os/commercial/projects/${item.project_id}`}>{item.project_title}</Link>
        </div>
        <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
      </header>
      <div className="ws-dispute-body">
        <ol className="ws-timeline" aria-label="Dispute timeline">
          {disputeTimeline(item, userId).map((step) => (
            <li key={step.key} data-domain={step.tone === 'neutral' ? undefined : step.tone}>
              <span className="ws-timeline-dot" aria-hidden="true" />
              <span className="ws-timeline-copy">
                <span className="ws-timeline-label">
                  {step.label}
                  {step.side && (
                    <em data-side={step.side}>{step.side === 'you' ? 'You' : 'Other party'}</em>
                  )}
                </span>
                {step.detail && <small>{step.detail}</small>}
              </span>
              {step.at && <time dateTime={step.at}>{when(step.at)}</time>}
            </li>
          ))}
        </ol>
        <div className="ws-dispute-action">
          {state === 'awaiting' && (
            <>
              <p>
                The other party proposes{' '}
                <strong>
                  {(
                    OUTCOME_LABEL[item.resolution!.outcome] ?? item.resolution!.outcome
                  ).toLowerCase()}
                </strong>
                . Accepting settles the dispute; any payment still happens on the project.
              </p>
              <div className="ws-dispute-buttons">
                <Button disabled={busy} onClick={() => respond('accept')}>
                  Accept proposal
                </Button>
                <Button disabled={busy} variant="secondary" onClick={() => respond('reject')}>
                  Reject proposal
                </Button>
              </div>
            </>
          )}
          {state === 'open' && (
            <>
              <p>Propose how to settle this. The other party can accept or reject it.</p>
              <ProposalForm busy={busy} onSubmit={propose} />
            </>
          )}
          {state === 'proposed' &&
            (revising ? (
              <ProposalForm busy={busy} onSubmit={propose} />
            ) : (
              <>
                <p>Your proposal is with the other party. You can replace it until they answer.</p>
                <Button variant="secondary" onClick={() => setRevising(true)}>
                  Revise proposal
                </Button>
              </>
            ))}
          {state === 'resolved' && (
            <>
              <p className="ws-dispute-settled">
                <CheckCircle2 size={18} aria-hidden="true" /> Settled by both parties.
              </p>
              <Link className="text-button" to={`/os/commercial/projects/${item.project_id}`}>
                Open the project for payment actions
              </Link>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

/** /os/disputes — both parties' timeline for each milestone dispute, with propose / accept /
 * reject. An accepted proposal never moves money; payment actions remain on the project. */
export function DisputesPage() {
  const { state } = useWorkspace();
  const userId = state.user.id;
  const [items, setItems] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'resolved' ? 'resolved' : 'open';
  const load = useCallback(async () => setItems(await api<Dispute[]>('/disputes')), []);
  useEffect(() => {
    void load()
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [load]);
  async function act(path: string, body: unknown) {
    setBusy(true);
    setError('');
    try {
      await api(path, body);
      await load();
      notifyActivityChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const open = items.filter((item) => isOpenDispute(item.status));
  const closed = items.filter((item) => !isOpenDispute(item.status));
  const shown = tab === 'open' ? open : closed;
  return (
    <div className="ws-page" data-domain="risk" data-scroll-feedback="off">
      <PageHeader
        eyebrow="RISK · DISPUTES"
        title="Disputes"
        description="Agree on revisions, refunds or acceptance with the other party. An accepted proposal never moves money automatically; payment actions remain in the project."
        kpis={loading ? [] : disputeKpis(items, userId)}
        loadingKpis={loading ? 3 : 0}
      />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <section className="ws-panel">
        <div className="ws-tabs" role="tablist" aria-label="Disputes">
          {(['open', 'resolved'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setParams(value === 'open' ? {} : { tab: value }, { replace: true })}
            >
              {value === 'open' ? 'Open' : 'Resolved'}
              <span>{value === 'open' ? open.length : closed.length}</span>
            </button>
          ))}
        </div>
        {loading ? (
          <div className="ws-needs-skeleton" aria-busy="true" aria-label="Loading disputes">
            <span />
            <span />
          </div>
        ) : shown.length === 0 ? (
          <div className="ws-panel-state ws-empty">
            <ShieldCheck size={28} aria-hidden="true" />
            <h3>{tab === 'open' ? 'No open disputes' : 'No resolved disputes yet'}</h3>
            <p>
              {tab === 'open'
                ? 'If delivery and approval don’t line up, a milestone can be disputed from its project.'
                : 'Disputes settled by both parties are kept here for reference.'}
            </p>
          </div>
        ) : (
          <ul className="ws-disputes">
            {shown.map((item) => (
              <DisputeCard key={item.id} item={item} userId={userId} busy={busy} act={act} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
