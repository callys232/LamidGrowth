import { useCallback, useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { api } from '../../../api';
import { Empty } from '../../../shared/ui/Empty';
import { SkeletonList } from '../../../shared/ui/Skeleton';
import { StatusPill } from '../../../shared/workspace/StatusPill';

type Opportunity = {
  id: string;
  title: string;
  description: string;
  source: string;
  status: string;
  value_estimate: number | null;
  type: string | null;
  readiness: 'ready' | 'partial' | 'not_ready';
  created_at: string;
};
const STATUSES = ['identified', 'qualified', 'pursuing', 'won', 'lost'];

function useOpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api<Opportunity[]>('/opportunities', undefined, 'GET')
      .then((items) => {
        setOpportunities(items);
        setError('');
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => load(), [load]);

  const create = useCallback(async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await api<Opportunity>('/opportunities', { title, description: '', source });
      setTitle('');
      setSource('');
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [title, source, load]);

  const advance = useCallback(
    async (id: string, status: string) => {
      setBusy(true);
      try {
        await api<Opportunity>(`/opportunities/${id}`, { status }, 'PATCH');
        load();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  return { opportunities, loading, error, title, setTitle, source, setSource, create, busy, advance };
}

const READINESS_LABEL: Record<Opportunity['readiness'], string> = {
  ready: 'Ready',
  partial: 'Partial',
  not_ready: 'Not ready',
};

/** /os/opportunities — the pipeline of leads being pursued, with a real readiness signal. */
export function OpportunitiesPage() {
  const page = useOpportunitiesPage();
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Opportunities</h2>
          <span>The pipeline of leads worth pursuing, and how ready each one actually is.</span>
        </div>
      </div>
      {page.error && <p className="activity-feed-status activity-feed-error">{page.error}</p>}
      {page.loading && <SkeletonList rows={4} />}
      {!page.loading && page.opportunities.length === 0 && (
        <Empty title="No opportunities yet">Add one below to start tracking it.</Empty>
      )}
      {!page.loading && page.opportunities.length > 0 && (
        <ol className="activity-feed-list">
          {page.opportunities.map((opp) => (
            <li key={opp.id} className="activity-feed-row">
              <span className="activity-feed-icon">
                <TrendingUp size={15} />
              </span>
              <span className="activity-feed-title">
                <strong>{opp.title}</strong>{' '}
                <small>
                  {READINESS_LABEL[opp.readiness]}
                  {opp.value_estimate ? ` · est. ${opp.value_estimate}` : ''}
                </small>
              </span>
              <StatusPill status={opp.status} />
              <select
                value={opp.status}
                disabled={page.busy}
                onChange={(e) => page.advance(opp.id, e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ol>
      )}
      <div className="panel-heading" style={{ marginTop: 24 }}>
        <h3>Add an opportunity</h3>
      </div>
      <div className="settings-card">
        <input
          type="text"
          placeholder="Title"
          value={page.title}
          onChange={(e) => page.setTitle(e.target.value)}
        />
        <input
          type="text"
          placeholder="Source (optional)"
          value={page.source}
          onChange={(e) => page.setSource(e.target.value)}
        />
        <button type="button" disabled={page.busy || !page.title.trim()} onClick={page.create}>
          Add opportunity
        </button>
      </div>
    </section>
  );
}
