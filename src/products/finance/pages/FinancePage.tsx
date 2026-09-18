import { Link } from 'react-router-dom';
import { Empty } from '../../../shared/ui/Empty';
import { StatusPill } from '../../../shared/workspace/StatusPill';
import { useFinancePage } from '../hooks/useFinancePage';

function formatMinor(amountMinor: number, currency: string) {
  return `${(amountMinor / 100).toFixed(2)} ${currency}`;
}
function dateLabel(value: string | number) {
  const date = typeof value === 'number' ? new Date(value) : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

/** /os/finance — real financial data this app actually has: your points position and, for
 * workspace owners, the commercial-marketplace escrow/payout/billing trail. No fabricated "cash
 * position", "runway" or "forecast" — this app doesn't track expenses or revenue, so it doesn't
 * pretend to. */
export function FinancePage() {
  const page = useFinancePage();

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Finance</h2>
          <span>Your points position, plus escrow and payouts for this workspace.</span>
        </div>
      </div>

      {page.error && (
        <p className="form-error" role="alert">
          {page.error}
        </p>
      )}

      <section className="panel settings-card">
        <h3>Your points</h3>
        {!page.points ? (
          <Empty title="Loading…">Fetching your points position.</Empty>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div>
                <strong style={{ fontSize: 24 }}>{page.points.balance}</strong>
                <div>
                  <small>points available</small>
                </div>
              </div>
              <div>
                <strong style={{ fontSize: 24 }}>
                  {formatMinor(page.points.totalPurchasedMinor, page.points.currency)}
                </strong>
                <div>
                  <small>total purchased ({page.points.totalPurchasedPoints} points)</small>
                </div>
              </div>
              <div>
                <strong style={{ fontSize: 24 }}>
                  {formatMinor(page.points.unitPriceMinor, page.points.currency)}
                </strong>
                <div>
                  <small>per point</small>
                </div>
              </div>
            </div>
            <p>
              <Link to="/os/pricing">Buy more points</Link>
            </p>
            <h4>Recent activity</h4>
            {page.points.recentLedger.length === 0 ? (
              <Empty title="No points activity yet">Purchases and spend will appear here.</Empty>
            ) : (
              <ol className="activity-feed-list">
                {page.points.recentLedger.map((entry, i) => (
                  <li key={i} className="activity-feed-row">
                    <span className="activity-feed-title">
                      <strong>{entry.reason}</strong>
                      <br />
                      <small>{dateLabel(entry.created_at)}</small>
                    </span>
                    <StatusPill status={`${entry.amount > 0 ? '+' : ''}${entry.amount} pts`} />
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </section>

      {page.isOwner && page.overview && (
        <>
          <section className="panel settings-card">
            <h3>Escrow</h3>
            <p>Milestone funds held, released and refunded across every project in this workspace.</p>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div>
                <strong style={{ fontSize: 20 }}>{formatMinor(page.overview.escrow.heldMinor, 'USD')}</strong>
                <div>
                  <small>currently held</small>
                </div>
              </div>
              <div>
                <strong style={{ fontSize: 20 }}>{formatMinor(page.overview.escrow.releasedMinor, 'USD')}</strong>
                <div>
                  <small>released</small>
                </div>
              </div>
              <div>
                <strong style={{ fontSize: 20 }}>{formatMinor(page.overview.escrow.refundedMinor, 'USD')}</strong>
                <div>
                  <small>refunded</small>
                </div>
              </div>
              <div>
                <strong style={{ fontSize: 20 }}>{formatMinor(page.overview.escrow.pendingMinor, 'USD')}</strong>
                <div>
                  <small>pending</small>
                </div>
              </div>
            </div>
            {page.overview.escrow.items.length === 0 ? (
              <Empty title="No milestone funding yet">Funded milestones will appear here.</Empty>
            ) : (
              <ol className="activity-feed-list">
                {page.overview.escrow.items.map((item) => (
                  <li key={item.id} className="activity-feed-row">
                    <span className="activity-feed-title">
                      <strong>{item.milestoneTitle}</strong>
                      <br />
                      <small>
                        {item.projectTitle} · {dateLabel(item.createdAt)}
                      </small>
                    </span>
                    <StatusPill status={item.status} />
                    <span>{formatMinor(item.amountMinor, item.currency)}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="panel settings-card">
            <h3>Payouts</h3>
            {page.overview.transfers.length === 0 ? (
              <Empty title="No payouts yet">Released milestone payouts will appear here.</Empty>
            ) : (
              <ol className="activity-feed-list">
                {page.overview.transfers.map((t) => (
                  <li key={t.id} className="activity-feed-row">
                    <span className="activity-feed-title">
                      <strong>{t.milestoneTitle}</strong>
                      <br />
                      <small>{dateLabel(t.createdAt)}</small>
                    </span>
                    <StatusPill status={t.status} />
                    <span>{formatMinor(t.amountMinor, t.currency)}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="panel settings-card">
            <h3>Billing</h3>
            <p>Concierge and service fees for this workspace. Total: {formatMinor(page.overview.billing.totalMinor, page.overview.billing.currency)}</p>
            {page.overview.billing.lineItems.length === 0 && (
              <Empty title="No billing line items">Nothing owed at this time.</Empty>
            )}
          </section>
        </>
      )}
    </section>
  );
}
