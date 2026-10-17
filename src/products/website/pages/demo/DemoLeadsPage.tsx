import { useCallback, useEffect, useState } from 'react';
import { api } from '../../../../api';
import { useWorkspace } from '../../../workspace/components/WorkspaceShell';

type Lead = {
  id: string;
  name: string;
  email: string;
  profile: string;
  tier: string;
  created_at: number;
  verified_at: number | null;
  converted_at: number | null;
  last_seen_at: number | null;
  followup_opt_in: number;
  events: number;
  failures: number;
  failed_emails: number;
  mail_status: string | null;
  delivery_status: string | null;
};
type DemoEvent = { event: string; path: string; profile: string; tier: string; created_at: number };
type MailHealth = {
  healthy: boolean;
  workerHealthy: boolean;
  lastCompletedAt: number | null;
  warnings: string[];
};
type MailMessage = {
  outbox_table: string;
  queue_id: string;
  provider_message_id: string | null;
  delivery_status: string;
  queue_status: string;
  reviewed_at: number | null;
};
const date = (value: number | null) => (value ? new Date(value).toLocaleString() : '—');
const mailStatus = (status: string | null) =>
  status === 'sent'
    ? 'Accepted by provider; delivery unconfirmed'
    : status === 'delivery_unknown'
      ? 'Acceptance unknown; review provider logs'
      : status || '—';

export function DemoLeadsPage() {
  const { state } = useWorkspace();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [page, setPage] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [events, setEvents] = useState<DemoEvent[]>([]);
  const [deleting, setDeleting] = useState<Lead | null>(null);
  const [resending, setResending] = useState<Lead | null>(null);
  const [health, setHealth] = useState<MailHealth | null>(null);
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [notice, setNotice] = useState('');
  const [reviewing, setReviewing] = useState<MailMessage | null>(null);
  const [reviewReason, setReviewReason] = useState('');
  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const [leads, health, messages] = await Promise.all([
        api<{ leads: Lead[] }>(`/admin/demo-leads?page=${page}`),
        api<MailHealth>('/admin/mail/health'),
        api<MailMessage[]>('/admin/mail/messages'),
      ]);
      setLeads(leads.leads);
      setHealth(health);
      setMessages(messages);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }, [page]);
  useEffect(() => {
    if (state.user.ecosystemAdmin) void load();
  }, [load, state.user.ecosystemAdmin]);
  async function inspect(lead: Lead) {
    setSelected(lead);
    setEvents([]);
    setError('');
    try {
      setEvents(await api<DemoEvent[]>(`/admin/demo-leads/${lead.id}/events`));
    } catch (cause) {
      setError((cause as Error).message);
    }
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/admin/demo-leads/${deleting.id}`, {}, 'DELETE');
      setDeleting(null);
      setSelected(null);
      await load();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!state.user.ecosystemAdmin)
    return <p>Only ecosystem administrators can manage demo registrations.</p>;
  return (
    <section>
      <h1>Demo leads</h1>
      <p>Review registrations, email delivery, demo engagement, and account conversions.</p>
      {notice && <p role="status">{notice}</p>}
      {health && (
        <section className="panel">
          <h2>Mail operations</h2>
          <p>
            {health.workerHealthy ? 'Mail worker is responding.' : 'Mail worker needs attention.'}{' '}
            Last completed check: {date(health.lastCompletedAt)}.
          </p>
          {health.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
          <details>
            <summary>Recent provider outcomes</summary>
            <ul>
              {messages.map((message) => (
                <li key={`${message.outbox_table}:${message.queue_id}`}>
                  {message.queue_id}: {message.delivery_status || message.queue_status}. Provider
                  ID: {message.provider_message_id || 'Not recorded'}{' '}
                  {message.provider_message_id && (
                    <button
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        setError('');
                        try {
                          await api('/admin/mail/reconcile', {
                            table: message.outbox_table,
                            queueId: message.queue_id,
                          });
                          setNotice('Provider status checked. No email was resent.');
                          await load();
                        } catch (cause) {
                          setError((cause as Error).message);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Check provider status
                    </button>
                  )}
                  {(['failed', 'delivery_unknown'].includes(message.queue_status) ||
                    (!message.reviewed_at &&
                      ['failed', 'bounced', 'complained', 'suppressed'].includes(
                        message.delivery_status,
                      ))) && (
                    <button
                      disabled={busy}
                      onClick={() => {
                        setReviewing(message);
                        setReviewReason('');
                      }}
                    >
                      Review result
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}
      {reviewing && (
        <div role="alert">
          <p>
            Record your review of {reviewing.queue_id}. This does not resend mail, remove
            suppression, or confirm delivery.
          </p>
          <label>
            Review note{' '}
            <input
              value={reviewReason}
              maxLength={300}
              onChange={(event) => setReviewReason(event.target.value)}
            />
          </label>
          <button
            disabled={busy || reviewReason.trim().length < 10}
            onClick={async () => {
              setBusy(true);
              setError('');
              try {
                await api('/admin/mail/acknowledge', {
                  table: reviewing.outbox_table,
                  queueId: reviewing.queue_id,
                  reason: reviewReason,
                });
                setReviewing(null);
                setNotice('Review recorded. No email was resent.');
                await load();
              } catch (cause) {
                setError((cause as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Record review
          </button>{' '}
          <button onClick={() => setReviewing(null)}>Cancel</button>
        </div>
      )}
      {resending && (
        <div role="alert">
          <p>
            Send a fresh demo access link to {resending.email}? An email already being sent may
            still arrive. Suppressed addresses cannot receive a fresh link.
          </p>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError('');
              try {
                await api(`/admin/demo-leads/${resending.id}/resend`, {});
                setResending(null);
                setNotice('Fresh demo link queued for the registered email address.');
                await load();
              } catch (cause) {
                setError((cause as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Send fresh link
          </button>{' '}
          <button onClick={() => setResending(null)}>Cancel</button>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      <button disabled={busy} onClick={() => void load()}>
        Refresh
      </button>
      {deleting && (
        <div role="alert">
          <p>
            Delete {deleting.email} and all their saved demo progress, access links, emails, and
            usage history? This cannot be undone.
          </p>
          <button disabled={busy} onClick={() => void remove()}>
            Delete registration
          </button>{' '}
          <button onClick={() => setDeleting(null)}>Cancel</button>
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th scope="col">Visitor</th>
              <th scope="col">Demo</th>
              <th scope="col">Status</th>
              <th scope="col">Last active</th>
              <th scope="col">Events</th>
              <th scope="col">Failures</th>
              <th scope="col">Email</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td>
                  {lead.name}
                  <br />
                  {lead.email}
                </td>
                <td>
                  {lead.profile} / {lead.tier}
                </td>
                <td>
                  {lead.converted_at
                    ? 'Account created and verified'
                    : lead.verified_at
                      ? 'Email verified'
                      : 'Awaiting verification'}
                  <br />
                  {lead.followup_opt_in ? 'Reminder requested' : 'No reminders'}
                </td>
                <td>{date(lead.last_seen_at)}</td>
                <td>{lead.events}</td>
                <td>{lead.failures || 0}</td>
                <td>
                  {mailStatus(lead.mail_status)}
                  {lead.delivery_status && (
                    <>
                      <br />
                      Provider outcome: {lead.delivery_status}
                    </>
                  )}
                  {lead.failed_emails > 0 && ` (${lead.failed_emails} failed deliveries)`}
                </td>
                <td>
                  <button onClick={() => void inspect(lead)}>View activity</button>{' '}
                  <button disabled={busy} onClick={() => setResending(lead)}>
                    Fresh demo link
                  </button>{' '}
                  <button onClick={() => setDeleting(lead)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!busy && !leads.length && <p>No registrations on this page.</p>}
      <button disabled={busy || page === 0} onClick={() => setPage(page - 1)}>
        Previous
      </button>{' '}
      <span>Page {page + 1}</span>{' '}
      <button disabled={busy || leads.length < 50} onClick={() => setPage(page + 1)}>
        Next
      </button>
      {selected && (
        <section>
          <h2>Recent activity for {selected.name}</h2>
          <p>Registered {date(selected.created_at)}</p>
          <ul>
            {events.map((event, i) => (
              <li key={i}>
                {date(event.created_at)} — {event.event.replaceAll('_', ' ')}: {event.path} (
                {event.profile}, {event.tier})
              </li>
            ))}
          </ul>
          {!events.length && <p>No recorded activity.</p>}
        </section>
      )}
    </section>
  );
}
