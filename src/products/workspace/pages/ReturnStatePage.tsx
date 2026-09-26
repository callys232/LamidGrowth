import { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { api } from '../../../api';
import { Empty } from '../../../shared/ui/Empty';

type Lane = 'tasks' | 'learning' | 'goals' | 'audit' | 'workflows';
type ReturnStateResponse = Record<Lane, { lastReviewedAt: string | null; items: Record<string, unknown>[] }>;

const LANE_LABELS: Record<Lane, string> = {
  tasks: 'Tasks needing attention',
  learning: 'Learning needing attention',
  goals: 'Goal signal matches',
  audit: 'Material changes',
  workflows: 'Workflows awaiting approval',
};
const LANES: Lane[] = ['tasks', 'learning', 'goals', 'audit', 'workflows'];

function itemLabel(lane: Lane, item: Record<string, unknown>): string {
  switch (lane) {
    case 'tasks':
      return `${item.title} (${item.attention})`;
    case 'learning':
      return String(item.path_title ?? item.id);
    case 'goals':
      return String(item.title ?? item.source_id);
    case 'audit':
      return `${item.action}: ${item.detail}`;
    case 'workflows':
      return String(item.title ?? item.id);
    default:
      return String(item.id);
  }
}

function useReturnStatePage() {
  const [data, setData] = useState<ReturnStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api<ReturnStateResponse>('/return-state', undefined, 'GET')
      .then((res) => {
        setData(res);
        setError('');
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => load(), [load]);

  const markReviewed = useCallback(
    async (lane: Lane) => {
      setBusy(true);
      try {
        await api('/return-state/checkpoint', { lane });
        load();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  return { data, loading, error, busy, markReviewed };
}

/** What's changed across every lane since you last looked — the return-state continuity view. */
export function ReturnStatePage() {
  const page = useReturnStatePage();
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>What's new</h2>
          <span>What changed across your work since you last checked each area.</span>
        </div>
      </div>
      {page.error && <p className="activity-feed-status activity-feed-error">{page.error}</p>}
      {page.loading && <p className="activity-feed-status">Loading…</p>}
      {!page.loading &&
        page.data &&
        LANES.map((lane) => {
          const lane_data = page.data![lane];
          return (
            <div key={lane} style={{ marginTop: 20 }}>
              <div className="panel-heading">
                <div>
                  <h3>{LANE_LABELS[lane]}</h3>
                  <span>
                    {lane_data.lastReviewedAt
                      ? `Last reviewed ${new Date(lane_data.lastReviewedAt).toLocaleString()}`
                      : 'Never reviewed'}
                  </span>
                </div>
                <button type="button" disabled={page.busy} onClick={() => page.markReviewed(lane)}>
                  Mark reviewed
                </button>
              </div>
              {lane_data.items.length === 0 ? (
                <Empty title="Nothing new">You're caught up here.</Empty>
              ) : (
                <ol className="activity-feed-list">
                  {lane_data.items.map((item, index) => (
                    <li key={index} className="activity-feed-row">
                      <span className="activity-feed-icon">
                        <Bell size={15} />
                      </span>
                      <span className="activity-feed-title">{itemLabel(lane, item)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          );
        })}
    </section>
  );
}
