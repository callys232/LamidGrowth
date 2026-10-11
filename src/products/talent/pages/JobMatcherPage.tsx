import { Bookmark, BriefcaseBusiness, RefreshCw, Search, UserRound } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../../api';
import { Button } from '../../../shared/ui/Button';
import { PageHeader } from '../../../shared/workspace/ui/PageHeader';
import { StatusPill } from '../../../shared/workspace/ui/StatusPill';
import { JobDetail } from '../../commercial/components/JobDetail';
import type { Job, Options } from '../../commercial/types';
import type { JobMatch, TalentProfile } from '../hooks/useTalentPage';
import { Breakdown } from '../matcher/Breakdown';
import { matcherKpis } from '../matcher/matchModel';
import { ScoreRing } from '../matcher/ScoreRing';
import type { Bid, JobWatch, WatchMatch } from '../talentTypes';

type Tab = 'matches' | 'search' | 'bids' | 'saved';
const TABS: { value: Tab; label: string }[] = [
  { value: 'matches', label: 'Matches' },
  { value: 'search', label: 'Search' },
  { value: 'bids', label: 'My bids' },
  { value: 'saved', label: 'Saved searches' },
];
const money = (amount: number, currency: string) =>
  new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(
    amount,
  );
const budget = (min: number, max: number, currency: string) =>
  `${money(min, currency)} – ${money(max, currency)}`;

function SavedSearch({
  watch,
  onRemove,
  onOpen,
}: {
  watch: JobWatch;
  onRemove: () => void;
  onOpen: (jobId: string) => void;
}) {
  const [matches, setMatches] = useState<WatchMatch[]>([]);
  const [fresh, setFresh] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(
    () => api<WatchMatch[]>(`/talent/watches/${watch.id}/matches`).then(setMatches),
    [watch.id],
  );
  useEffect(() => {
    void load().catch((e) => setError((e as Error).message));
  }, [load]);
  async function scan() {
    setBusy(true);
    setError('');
    try {
      const result = await api<{ newMatches: unknown[] }>(`/talent/watches/${watch.id}/scan`, {});
      setFresh(result.newMatches.length);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <li className="ws-watch">
      <header>
        <div>
          <strong>
            {[...watch.categories, watch.keywords && `“${watch.keywords}”`]
              .filter(Boolean)
              .join(' · ')}
          </strong>
          <span>
            {matches.length} {matches.length === 1 ? 'match' : 'matches'}
            {fresh !== null && ` · ${fresh} new ${fresh === 1 ? 'match' : 'matches'} found`}
          </span>
        </div>
        <div className="ws-watch-actions">
          <Button variant="secondary" disabled={busy} onClick={() => void scan()}>
            <RefreshCw size={14} /> Scan now
          </Button>
          <button className="text-button" onClick={onRemove}>
            Remove
          </button>
        </div>
      </header>
      {error && <p role="alert">{error}</p>}
      {matches.length > 0 && (
        <ul className="ws-watch-matches">
          {matches.map((m) => (
            <li key={m.id} className="ws-watch-match" data-seen={m.seen || undefined}>
              <button type="button" onClick={() => onOpen(m.jobId)}>
                <strong>{m.title}</strong>
                <span>
                  {m.category} · {budget(m.budgetMin, m.budgetMax, m.currency)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/** /os/job-matcher — open jobs ranked against your talent profile, job search, your bids and
 * saved searches with alerts. Scores are ranking signals, not guarantees. */
export function JobMatcherPage() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.find((t) => t.value === params.get('tab'))?.value ?? 'matches';
  const [profile, setProfile] = useState<TalentProfile | null>(null);
  const [matches, setMatches] = useState<JobMatch[] | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [watches, setWatches] = useState<JobWatch[]>([]);
  const [options, setOptions] = useState<Options | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<Job | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Job[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [watchError, setWatchError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void (async () => {
      const [mine, config, myBids, myWatches] = await Promise.all([
        api<TalentProfile | null>('/talent/profile/mine'),
        api<Options>('/job-options'),
        api<Bid[]>('/bids/mine'),
        api<JobWatch[]>('/talent/watches').catch(() => []),
      ]);
      const ranked = mine ? await api<JobMatch[]>('/talent/job-matches') : null;
      if (!active) return;
      setProfile(mine);
      setOptions(config);
      setBids(myBids);
      setWatches(myWatches);
      setMatches(ranked);
    })()
      .catch((e) => {
        if (active) setError((e as Error).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision]);

  async function search(event?: FormEvent) {
    event?.preventDefault();
    setSearching(true);
    try {
      setResults(await api<Job[]>(`/marketplace/jobs?q=${encodeURIComponent(query.trim())}`));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSearching(false);
    }
  }
  useEffect(() => {
    if (tab === 'search' && results === null) void search();
    // Load the open jobs once when the Search tab first opens.
  }, [tab]);

  async function openJob(jobId: string) {
    const known =
      matches?.find((m) => m.jobId === jobId)?.job ?? results?.find((j) => j.id === jobId);
    if (known) return setSelected(known);
    const all = await api<Job[]>('/marketplace/jobs?q=').catch(() => []);
    setSelected(all.find((j) => j.id === jobId) ?? null);
  }
  async function saveWatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWatchError('');
    const form = new FormData(event.currentTarget);
    const category = String(form.get('category') || '');
    try {
      const created = await api<JobWatch>('/talent/watches', {
        categories: category ? [category] : [],
        keywords: String(form.get('keywords') || '').trim(),
      });
      setWatches((list) => [created, ...list]);
      event.currentTarget.reset();
    } catch (e) {
      setWatchError((e as Error).message);
    }
  }
  async function removeWatch(id: string) {
    try {
      await api(`/talent/watches/${id}`, {}, 'DELETE');
      setWatches((list) => list.filter((w) => w.id !== id));
    } catch (e) {
      setWatchError((e as Error).message);
    }
  }
  const counts: Partial<Record<Tab, number>> = {
    matches: matches?.length,
    bids: bids.length,
    saved: watches.length,
  };

  return (
    <div className="ws-page" data-domain="talent" data-scroll-feedback="off">
      <PageHeader
        eyebrow="TALENT · JOB MATCHER"
        title="Job Matcher"
        description="Open client jobs ranked against your skills, rate and profile. Scores are ranking signals, not guarantees of suitability or engagement."
        actions={
          <>
            <Link className="button button-secondary" to="/os/talent">
              <UserRound size={15} /> Edit talent profile
            </Link>
            <Button
              variant="secondary"
              disabled={loading}
              onClick={() => setRevision((r) => r + 1)}
            >
              <RefreshCw size={15} /> Refresh
            </Button>
          </>
        }
        kpis={loading || error ? [] : matcherKpis({ matches, bids, watches })}
        loadingKpis={loading ? 4 : 0}
      />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <section className="ws-panel">
        <div className="ws-tabs" role="tablist" aria-label="Job Matcher">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={tab === t.value}
              onClick={() =>
                setParams(t.value === 'matches' ? {} : { tab: t.value }, { replace: true })
              }
            >
              {t.label}
              {counts[t.value] !== undefined && <span>{counts[t.value]}</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="ws-needs-skeleton" aria-busy="true" aria-label="Loading matches">
            <span />
            <span />
            <span />
          </div>
        ) : tab === 'matches' ? (
          !profile ? (
            <div className="ws-panel-state ws-empty">
              <UserRound size={28} aria-hidden="true" />
              <h3>Create your talent profile</h3>
              <p>
                Matches compare open jobs with your headline, skills and rate. Add them to your{' '}
                <Link to="/os/talent">talent profile</Link> to see ranked jobs here.
              </p>
            </div>
          ) : !matches?.length ? (
            <div className="ws-panel-state ws-empty">
              <BriefcaseBusiness size={28} aria-hidden="true" />
              <h3>No matching open jobs yet</h3>
              <p>
                Broaden your skills in your <Link to="/os/talent">talent profile</Link>, or search
                all open jobs.
              </p>
            </div>
          ) : (
            <ul className="ws-matches">
              {matches.map((match) => (
                <li className="ws-match" key={match.jobId}>
                  <ScoreRing score={match.score} />
                  <div className="ws-match-main">
                    <div className="ws-match-head">
                      <h3>{match.title}</h3>
                      <StatusPill tone="opportunities">{match.category}</StatusPill>
                    </div>
                    <p className="ws-match-budget">
                      Budget {budget(match.budgetMin, match.budgetMax, match.currency)}
                    </p>
                    <Breakdown breakdown={match.breakdown} />
                  </div>
                  <Button disabled={!match.job} onClick={() => setSelected(match.job ?? null)}>
                    Review job & apply
                  </Button>
                </li>
              ))}
            </ul>
          )
        ) : tab === 'search' ? (
          <div className="ws-search">
            <form role="search" onSubmit={(e) => void search(e)}>
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                aria-label="Search open jobs"
                placeholder="Search open jobs by title or category"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Button type="submit" disabled={searching}>
                Search
              </Button>
            </form>
            {results !== null && results.length === 0 ? (
              <div className="ws-panel-state ws-empty">
                <Search size={26} aria-hidden="true" />
                <h3>No open jobs match</h3>
                <p>Try a broader word, or save a search to be alerted when one is posted.</p>
              </div>
            ) : (
              <ul className="ws-job-list">
                {results?.map((job) => (
                  <li key={job.id} className="ws-job-row">
                    <div>
                      <strong>{job.title}</strong>
                      <span>
                        {job.category} · {budget(job.budget_min, job.budget_max, job.currency)} ·{' '}
                        {job.timeline}
                      </span>
                    </div>
                    <Button variant="secondary" onClick={() => setSelected(job)}>
                      Review job
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : tab === 'bids' ? (
          bids.length === 0 ? (
            <div className="ws-panel-state ws-empty">
              <BriefcaseBusiness size={28} aria-hidden="true" />
              <h3>No bids yet</h3>
              <p>When you apply to a job, your bid and its status appear here.</p>
            </div>
          ) : (
            <ul className="ws-job-list">
              {bids.map((bid) => (
                <li key={bid.id} className="ws-job-row ws-bid">
                  <div>
                    <strong>{bid.job_title}</strong>
                    <span>
                      {money(bid.proposed_amount, bid.currency)} · {bid.timeline} · sent{' '}
                      {new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(
                        new Date(Number(bid.created_at)),
                      )}
                    </span>
                  </div>
                  <StatusPill tone={bid.job_status === 'open' ? 'opportunities' : 'neutral'}>
                    {bid.status}
                  </StatusPill>
                </li>
              ))}
            </ul>
          )
        ) : (
          <div className="ws-saved">
            <form className="ws-watch-form" onSubmit={(e) => void saveWatch(e)}>
              <label>
                <span>Category</span>
                <select name="category" defaultValue="">
                  <option value="">Any category</option>
                  {options?.categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Keywords</span>
                <input name="keywords" maxLength={500} placeholder="e.g. dashboard, audit" />
              </label>
              <Button type="submit">
                <Bookmark size={15} /> Save search
              </Button>
            </form>
            {watchError && (
              <p className="form-error" role="alert">
                {watchError}
              </p>
            )}
            {watches.length === 0 ? (
              <div className="ws-panel-state ws-empty">
                <Bookmark size={26} aria-hidden="true" />
                <h3>No saved searches</h3>
                <p>Save a category or keyword and scan it for newly posted jobs.</p>
              </div>
            ) : (
              <ul className="ws-watches">
                {watches.map((watch) => (
                  <SavedSearch
                    key={watch.id}
                    watch={watch}
                    onRemove={() => void removeWatch(watch.id)}
                    onOpen={(jobId) => void openJob(jobId)}
                  />
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
      {selected && options && (
        <JobDetail
          job={selected}
          owner={false}
          bidCost={options.bidCost}
          onClose={() => setSelected(null)}
          onSaved={() => setRevision((r) => r + 1)}
        />
      )}
    </div>
  );
}
