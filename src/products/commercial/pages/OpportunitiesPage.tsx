import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Plus, TrendingUp } from 'lucide-react';
import { api } from '../../../api';
import { Button } from '../../../shared/ui/Button';
import { SkeletonList } from '../../../shared/ui/Skeleton';
import { PageHeader } from '../../../shared/workspace/ui/PageHeader';
import { StatusPill } from '../../../shared/workspace/ui/StatusPill';
import type { Kpi } from '../../workspace/overview/overviewModel';

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

  return {
    opportunities,
    loading,
    error,
    title,
    setTitle,
    source,
    setSource,
    create,
    busy,
    advance,
  };
}

const READINESS_LABEL: Record<Opportunity['readiness'], string> = {
  ready: 'Ready',
  partial: 'Partial',
  not_ready: 'Not ready',
};
const READINESS_TONE = { ready: 'money', partial: 'opportunities', not_ready: 'neutral' } as const;
const STAGES: { key: string; label: string; statuses: string[] }[] = [
  { key: 'identified', label: 'Identified', statuses: ['identified'] },
  { key: 'qualified', label: 'Qualified', statuses: ['qualified'] },
  { key: 'pursuing', label: 'Pursuing', statuses: ['pursuing'] },
  { key: 'closed', label: 'Closed', statuses: ['won', 'lost'] },
];
const isOpen = (o: Opportunity) => o.status !== 'won' && o.status !== 'lost';
const money = (n: number) =>
  new Intl.NumberFormat('en', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);

function opportunityKpis(items: Opportunity[]): Kpi[] {
  const open = items.filter(isOpen);
  const valued = open.filter((o) => o.value_estimate !== null);
  return [
    {
      domain: 'opportunities',
      label: 'Open pipeline',
      value: String(open.length),
      hint: 'Identified, qualified or being pursued',
      to: '/os/opportunities',
    },
    {
      domain: 'opportunities',
      label: 'Pipeline value',
      value: money(valued.reduce((sum, o) => sum + (o.value_estimate ?? 0), 0)),
      hint: `${valued.length} of ${open.length} have a value estimate`,
      to: '/os/opportunities',
    },
    {
      domain: 'money',
      label: 'Ready to pursue',
      value: String(open.filter((o) => o.readiness === 'ready').length),
      hint: 'Valued, sourced and recently updated',
      to: '/os/opportunities',
    },
    {
      domain: 'work',
      label: 'Won',
      value: String(items.filter((o) => o.status === 'won').length),
      hint: `${items.filter((o) => o.status === 'lost').length} lost`,
      to: '/os/opportunities',
    },
  ];
}

/** /os/opportunities — the pipeline by stage, with a real readiness signal and value estimates. */
export function OpportunitiesPage() {
  const page = useOpportunitiesPage();
  const add = (event: FormEvent) => {
    event.preventDefault();
    void page.create();
  };
  return (
    <div className="ws-page" data-domain="opportunities">
      <PageHeader
        eyebrow="OPPORTUNITIES"
        title="Opportunities"
        description="Openings worth pursuing, and how ready you are to take each one on."
        kpis={page.loading ? [] : opportunityKpis(page.opportunities)}
        loadingKpis={page.loading ? 4 : 0}
      />
      {page.error && (
        <p className="form-error" role="alert">
          {page.error}
        </p>
      )}
      <section className="ws-panel" aria-labelledby="pipeline-title">
        <div className="ws-panel-heading">
          <div>
            <h2 id="pipeline-title">Pipeline</h2>
            <span>
              Move each opportunity as it progresses. Readiness is computed, never guessed.
            </span>
          </div>
        </div>
        {page.loading ? (
          <div className="ws-board">
            <SkeletonList rows={3} />
          </div>
        ) : (
          <div className="ws-board">
            {STAGES.map((stage) => {
              const cards = page.opportunities.filter((o) => stage.statuses.includes(o.status));
              return (
                <div className="ws-board-column" data-stage={stage.key} key={stage.key}>
                  <header>
                    <strong>{stage.label}</strong>
                    <span>{cards.length}</span>
                  </header>
                  {cards.length === 0 ? (
                    <p className="ws-board-empty">Nothing here yet</p>
                  ) : (
                    cards.map((opp) => (
                      <article className="ws-opp" key={opp.id} data-status={opp.status}>
                        <div className="ws-opp-head">
                          <TrendingUp size={15} aria-hidden="true" />
                          <strong>{opp.title}</strong>
                        </div>
                        <p className="ws-opp-meta">
                          {opp.source || 'No source yet'}
                          {opp.value_estimate !== null && ` · est. ${money(opp.value_estimate)}`}
                        </p>
                        <div className="ws-opp-foot">
                          <StatusPill tone={READINESS_TONE[opp.readiness]}>
                            {READINESS_LABEL[opp.readiness]}
                          </StatusPill>
                          {stage.key === 'closed' && (
                            <StatusPill tone={opp.status === 'won' ? 'money' : 'neutral'}>
                              {opp.status}
                            </StatusPill>
                          )}
                          <select
                            className="ws-opp-move"
                            aria-label="Move to"
                            value={opp.status}
                            disabled={page.busy}
                            onChange={(e) => page.advance(opp.id, e.target.value)}
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s[0].toUpperCase() + s.slice(1)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
      <section className="ws-panel" aria-labelledby="add-opportunity-title">
        <div className="ws-panel-heading">
          <div>
            <h2 id="add-opportunity-title">Add an opportunity</h2>
            <span>New opportunities start as identified. Add a source so readiness can rise.</span>
          </div>
        </div>
        <form className="ws-inline-form" onSubmit={add}>
          <label>
            <span>Opportunity title</span>
            <input
              type="text"
              value={page.title}
              onChange={(e) => page.setTitle(e.target.value)}
              placeholder="e.g. Referral from a past client"
              maxLength={200}
            />
          </label>
          <label>
            <span>Source</span>
            <input
              type="text"
              value={page.source}
              onChange={(e) => page.setSource(e.target.value)}
              placeholder="Optional — where it came from"
              maxLength={200}
            />
          </label>
          <Button type="submit" disabled={page.busy || !page.title.trim()}>
            <Plus size={15} /> Add opportunity
          </Button>
        </form>
      </section>
    </div>
  );
}
