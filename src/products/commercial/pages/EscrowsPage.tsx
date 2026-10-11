import { ArrowUpRight, Wallet } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../../shared/workspace/ui/PageHeader';
import { CurrencyBar, EscrowLedger } from '../escrow/EscrowLedger';
import { currencyTotals, escrowKpis, type EscrowFilter } from '../escrow/escrowModel';
import { useEscrows } from '../hooks/useEscrows';

const FILTERS: { value: EscrowFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'held', label: 'Held' },
  { value: 'released', label: 'Released' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'unfunded', label: 'Awaiting funding' },
];

/** /os/escrows — milestone funds by status and currency, and a per-project ledger with each
 * milestone's money timeline. Funding actions stay on the project page. */
export function EscrowsPage() {
  const page = useEscrows();
  const [params, setParams] = useSearchParams();
  const filter = FILTERS.find((option) => option.value === params.get('status'))?.value ?? 'all';
  const party = page.projects.filter((p) => !p.isTeamMember && p.milestones.length > 0);
  const totals = currencyTotals(page.projects);
  return (
    <div className="ws-page" data-domain="money" data-scroll-feedback="off">
      <PageHeader
        eyebrow="MONEY · ESCROW"
        title="Escrow"
        description="Milestone funds you’ve secured, released or returned — for projects where you’re the client or the delivery partner."
        actions={
          <Link className="button button-secondary" to="/os/commercial/projects">
            View projects <ArrowUpRight size={15} />
          </Link>
        }
        kpis={page.loading || page.error ? [] : escrowKpis(page.projects)}
        loadingKpis={page.loading ? 4 : 0}
      />
      {page.error ? (
        <section className="ws-panel ws-panel-state" role="alert">
          <p>{page.error}</p>
          <button className="text-button" onClick={page.retry}>
            Try again
          </button>
        </section>
      ) : page.loading ? null : !party.length ? (
        <section className="ws-panel ws-panel-state ws-empty">
          <Wallet size={28} aria-hidden="true" />
          <h3>No escrow yet</h3>
          <p>
            Award a job and add milestones to its project. Funds you secure for each milestone are
            tracked here until the work is approved.
          </p>
          <Link className="button button-primary" to="/os/commercial/projects">
            Go to projects
          </Link>
        </section>
      ) : (
        <>
          {totals.length > 0 && (
            <section className="ws-panel" aria-labelledby="funds-title">
              <div className="ws-panel-heading">
                <div>
                  <h2 id="funds-title">Funds by status</h2>
                  <span>Each currency is shown separately; amounts are never converted.</span>
                </div>
              </div>
              <div className="ws-currencies">
                {totals.map((total) => (
                  <CurrencyBar total={total} key={total.currency} />
                ))}
              </div>
            </section>
          )}
          <section className="ws-panel" aria-labelledby="ledger-title">
            <div className="ws-panel-heading">
              <div>
                <h2 id="ledger-title">Ledger</h2>
                <span>Every milestone by project. Open a timeline to see each recorded step.</span>
              </div>
            </div>
            <div className="ws-filters" role="group" aria-label="Filter milestones">
              {FILTERS.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  aria-pressed={filter === option.value}
                  onClick={() =>
                    setParams(option.value === 'all' ? {} : { status: option.value }, {
                      replace: true,
                    })
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
            <EscrowLedger projects={page.projects} filter={filter} />
          </section>
        </>
      )}
    </div>
  );
}
