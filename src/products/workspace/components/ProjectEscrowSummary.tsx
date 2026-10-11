import { Link } from 'react-router-dom';
import type { EscrowRecord } from '../../commercial/hooks/useEscrows';
export function ProjectEscrowSummary({
  projectCount,
  escrows,
  onProjects,
  onEscrows,
}: {
  projectCount: number;
  escrows: Pick<EscrowRecord, 'amountMinor' | 'currency' | 'status'>[];
  onProjects?: () => void;
  onEscrows?: () => void;
}) {
  const currencies = [...new Set(escrows.map((e) => e.currency))];
  return (
    <div className="dashboard-bottom">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Projects</h2>
            <span>Internal delivery plans and awarded work with milestones and approvals.</span>
          </div>
        </div>
        <p>
          <strong>{projectCount}</strong> projects in your workspace
        </p>
        {onProjects ? (
          <button className="text-button" onClick={onProjects}>
            View projects & milestones
          </button>
        ) : (
          <Link className="panel-bottom-link" to="/os/commercial/projects">
            View projects & milestones
          </Link>
        )}
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Escrow</h2>
            <span>Milestone funding held, released, refunded, or awaiting confirmation.</span>
          </div>
        </div>
        {currencies.length ? (
          currencies.map((currency) => (
            <div key={currency}>
              <strong>{currency}</strong>
              <dl className="escrow-summary-values">
                {['held', 'released', 'refunded', 'pending'].map((status) => (
                  <div key={status}>
                    <dt>{status}</dt>
                    <dd>
                      {new Intl.NumberFormat('en', { style: 'currency', currency }).format(
                        escrows
                          .filter((e) => e.currency === currency && e.status === status)
                          .reduce((sum, e) => sum + e.amountMinor, 0) / 100,
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))
        ) : (
          <p>No milestone funding yet.</p>
        )}
        {onEscrows ? (
          <button className="text-button" onClick={onEscrows}>
            View escrow activity
          </button>
        ) : (
          <Link className="panel-bottom-link" to="/os/escrows">
            View escrow activity
          </Link>
        )}
      </section>
    </div>
  );
}
