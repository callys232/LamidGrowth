import { api } from '../../../api';
import { Button } from '../../../shared/ui/Button';
import { Empty } from '../../../shared/ui/Empty';
import type { useNotificationsPage } from '../hooks/useNotificationsPage';

export function NotificationsRemindersSlide({
  error,
  items,
  setItems,
  setError,
}: Pick<ReturnType<typeof useNotificationsPage>, 'error' | 'items' | 'setItems' | 'setError'>) {
  return (
    <>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {!items.length && (
        <Empty title="No reminders yet">
          Workflow reminders will appear here when their approved step completes.
        </Empty>
      )}
      {items.map((item) => (
        <section className="panel settings-card" key={item.id}>
          <h2>{item.message}</h2>
          <p>{new Date(item.createdAt).toLocaleString()}</p>
          {item.readAt ? (
            <p>Read</p>
          ) : (
            <Button
              onClick={() => {
                void api(`/notifications/${item.id}`, { read: true }, 'PATCH')
                  .then(() =>
                    setItems((items) =>
                      items.map((notice) =>
                        notice.id === item.id
                          ? { ...notice, readAt: new Date().toISOString() }
                          : notice,
                      ),
                    ),
                  )
                  .catch((error: Error) => setError(error.message));
              }}
            >
              Mark as read
            </Button>
          )}
        </section>
      ))}
    </>
  );
}
