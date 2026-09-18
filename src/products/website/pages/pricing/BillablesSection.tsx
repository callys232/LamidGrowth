import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePublicBillables } from './usePublicBillables';
import './pricing-billables.css';

function formatMinor(amountMinor: number, currency: string) {
  const amount = amountMinor / 100;
  return `${currency === 'USD' ? '$' : currency + ' '}${amount % 1 === 0 ? amount : amount.toFixed(2)}`;
}

/** The concrete, live-priced half of /pricing — every registered tool and bundle, pulled straight
 * from the same agent_manifests/bundles tables the app bills against, so this can never drift into
 * marketing-only numbers. Modeled on a reference public SaaS pricing page (sidebar of platform
 * sections + per-engine jump links, a row of plan cards, then the full line-item price list) —
 * adapted to what this app actually sells: points-based billables and bundles, not seat tiers.
 * "Create a Bundle" from that reference is deliberately not replicated here: bundle authoring is an
 * ecosystem-admin action (see mountPricing's /api/admin/bundles), not something an anonymous
 * visitor — or even a signed-in member — can do, so a public link to it would be misleading. */
export function BillablesSection() {
  const { billables, bundles, error } = usePublicBillables();
  const [filter, setFilter] = useState('all');

  const engines = useMemo(
    () => (billables ? Array.from(new Set(billables.tools.map((t) => t.home_engine))).sort() : []),
    [billables],
  );
  const rows = useMemo(() => {
    if (!billables) return [];
    if (filter === 'all') return billables.tools;
    if (filter === 'free') return billables.tools.filter((t) => t.points_cost === 0);
    return billables.tools.filter((t) => t.home_engine === filter);
  }, [billables, filter]);

  return (
    <div className="pricing-billables" id="billables">
      <div className="pricing-billables-head">
        <h3>Every billable, in the open</h3>
        <p>
          {billables ? (
            <>
              Points cover every tool and engine call — 1 point costs{' '}
              {formatMinor(billables.pointsUnitPriceMinor, billables.currency)}. No hidden tiers: this is the same
              price list the app bills against.
            </>
          ) : (
            'Loading live pricing…'
          )}
        </p>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="pricing-billables-plans">
        <article className="pricing-plan-card">
          <h4>Pay as you go</h4>
          <p>Buy only the points you need, whenever you need them. No subscription required.</p>
          <div className="pricing-plan-price">
            {billables ? formatMinor(billables.pointsUnitPriceMinor, billables.currency) : '—'}
            <span>/point</span>
          </div>
          <Link className="button button-secondary" to="/signup">
            Get started free
          </Link>
        </article>
        {bundles?.map((bundle) => (
          <article key={bundle.id} className="pricing-plan-card is-bundle">
            <h4>{bundle.name}</h4>
            <p>{bundle.description || `${bundle.points_included} points included`}</p>
            <div className="pricing-plan-price">
              {formatMinor(bundle.price_minor, bundle.currency)}
              <span>{bundle.billing_cycle === 'monthly' ? '/mo' : ' one-time'}</span>
            </div>
            {bundle.items.length > 0 && (
              <ul className="pricing-plan-features">
                <li>{bundle.points_included} points included</li>
                {bundle.items.map((item) => (
                  <li key={item.id}>{item.name}</li>
                ))}
              </ul>
            )}
            <Link className="button button-primary" to="/signup">
              Buy now
            </Link>
          </article>
        ))}
      </div>

      {billables && (
        <div className="pricing-billables-layout">
          <nav className="pricing-billables-nav" aria-label="Browse billables">
            <div className="pricing-nav-group">
              <span className="pricing-nav-heading">Platform</span>
              <button type="button" className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>
                All billables
              </button>
              <button
                type="button"
                className={filter === 'free' ? 'is-active' : ''}
                onClick={() => setFilter('free')}
              >
                Free tools
              </button>
            </div>
            <div className="pricing-nav-group">
              <span className="pricing-nav-heading">Engines</span>
              {engines.map((engine) => (
                <button
                  key={engine}
                  type="button"
                  className={filter === engine ? 'is-active' : ''}
                  onClick={() => setFilter(engine)}
                >
                  {engine}
                </button>
              ))}
            </div>
          </nav>
          <div className="pricing-billables-table-wrap">
            <table className="pricing-billables-table">
              <thead>
                <tr>
                  <th>Tool</th>
                  <th>Engine</th>
                  <th>Oversight</th>
                  <th>Cost</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((tool) => (
                  <tr key={tool.id}>
                    <td>{tool.name}</td>
                    <td>{tool.home_engine}</td>
                    <td>{tool.human_gate === 'none' ? 'Runs autonomously' : `Human ${tool.human_gate}`}</td>
                    <td>{tool.points_cost === 0 ? 'Free' : `${tool.points_cost} pt${tool.points_cost === 1 ? '' : 's'}`}</td>
                  </tr>
                ))}
                {(filter === 'all' || filter === 'free') && (
                  <tr>
                    <td>{billables.deepReview.name}</td>
                    <td>—</td>
                    <td>{billables.deepReview.description}</td>
                    <td>{billables.deepReview.pointsCost} pts</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
