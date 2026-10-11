import { BellRing, CheckCheck } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../../api';
import { Button } from '../../../shared/ui/Button';
import type { useNotificationsPage } from '../hooks/useNotificationsPage';

const when = (iso: string) =>
  new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));

/** Review reminders as an inbox: unread first, mark one or all as read. */
export function NotificationsRemindersSlide({
  error,
  items,
  setItems,
  setError,
}: Pick<ReturnType<typeof useNotificationsPage>, 'error' | 'items' | 'setItems' | 'setError'>) {
  const [tab, setTab] = useState<'unread' | 'all'>('unread');
  const [busy, setBusy] = useState(false);
  const unread = items.filter((item) => !item.readAt);
  const shown = tab === 'unread' ? unread : items;
  async function markRead(ids: string[]) {
    setBusy(true);
    setError('');
    try {
      await Promise.all(ids.map((id) => api(`/notifications/${id}`, { read: true }, 'PATCH')));
      const now = new Date().toISOString();
      setItems((list) =>
        list.map((notice) => (ids.includes(notice.id) ? { ...notice, readAt: now } : notice)),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="ws-panel" data-scroll-feedback="off">
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="ws-inbox-bar">
        <div className="ws-tabs" role="tablist" aria-label="Reminders">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'unread'}
            onClick={() => setTab('unread')}
          >
            Unread <span>{unread.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'all'}
            onClick={() => setTab('all')}
          >
            All <span>{items.length}</span>
          </button>
        </div>
        <Button
          variant="secondary"
          disabled={busy || unread.length === 0}
          onClick={() => void markRead(unread.map((item) => item.id))}
        >
          <CheckCheck size={15} /> Mark all as read
        </Button>
      </div>
      {shown.length === 0 ? (
        <div className="ws-panel-state ws-empty">
          <BellRing size={28} aria-hidden="true" />
          <h3>{items.length === 0 ? 'No reminders yet' : 'You’re all caught up'}</h3>
          <p>
            {items.length === 0
              ? 'Workflow reminders will appear here when their approved step completes.'
              : 'Nothing unread. Earlier reminders are under All.'}
          </p>
        </div>
      ) : (
        <ul className="ws-inbox">
          {shown.map((item) => (
            <li key={item.id} data-unread={!item.readAt || undefined}>
              <span className="ws-inbox-dot" aria-hidden="true" />
              <span className="ws-inbox-copy">
                <strong>{item.message}</strong>
                <time dateTime={item.createdAt}>{when(item.createdAt)}</time>
              </span>
              {item.readAt ? (
                <span className="ws-inbox-read">Read</span>
              ) : (
                <button
                  type="button"
                  className="text-button"
                  disabled={busy}
                  onClick={() => void markRead([item.id])}
                >
                  Mark read
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
