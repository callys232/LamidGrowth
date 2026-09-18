import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../../../api';
import { writePendingBundle } from '../../../pricing/pendingBundle';
import { formatMinor, type Billables } from './usePublicBillables';

/** Self-serve "build your own bundle" tool for the public pricing page — pick tools across
 * engines, watch a running cart total, then check out. There is no bundle-discount or recurring-
 * subscription mechanism in the backend (see payments.mjs: every purchase, points or bundle, is a
 * single one-time Paystack charge; billing_cycle is a display label only, even on
 * admin-authored bundles), so this doesn't invent one — it prices a custom selection at the same
 * standard per-point rate as everything else and checks out through the same points-purchase
 * endpoint every other purchase on this app already uses. Signed-in visitors land straight on
 * Paystack; a 401 here means no session, so the selection is stashed (pendingBundle.ts) and the
 * visitor is sent to sign up, picking back up on /os/pricing. */
export function BundleBuilder({ billables }: { billables: Billables }) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [extraPoints, setExtraPoints] = useState(0);
  const [billingCycle, setBillingCycle] = useState<'one_time' | 'monthly'>('one_time');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const engines = useMemo(() => {
    const byEngine = new Map<string, typeof billables.tools>();
    for (const tool of billables.tools) {
      if (!byEngine.has(tool.home_engine)) byEngine.set(tool.home_engine, []);
      byEngine.get(tool.home_engine)!.push(tool);
    }
    return Array.from(byEngine.entries());
  }, [billables]);

  const selectedTools = billables.tools.filter((t) => selected[t.id]);
  const toolPoints = selectedTools.reduce((sum, t) => sum + t.points_cost, 0);
  const totalPoints = toolPoints + extraPoints;
  const totalPriceMinor = totalPoints * billables.pointsUnitPriceMinor;

  function toggle(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }
  function toggleEngine(tools: Billables['tools']) {
    const allSelected = tools.every((t) => selected[t.id]);
    setSelected((prev) => {
      const next = { ...prev };
      for (const t of tools) next[t.id] = !allSelected;
      return next;
    });
  }

  async function getBundle() {
    setBusy(true);
    setError('');
    try {
      const result = await api<{ authorizationUrl: string }>('/points/purchase', { points: totalPoints });
      window.location.href = result.authorizationUrl;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        writePendingBundle({
          toolNames: selectedTools.map((t) => t.name),
          extraPoints,
          totalPoints,
          billingCycle,
        });
        navigate('/signup');
        return;
      }
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pricing-bundle-builder">
      <p className="pricing-bundle-intro">
        Grow your toolkit in the areas that matter most. Pick the tools you want, and we'll total the points —
        priced at the same {formatMinor(billables.pointsUnitPriceMinor, billables.currency)}/point rate as
        everything else, no markup.
      </p>
      <div className="pricing-bundle-layout">
        <div className="pricing-bundle-engines">
          {engines.map(([engine, tools]) => {
            const allSelected = tools.every((t) => selected[t.id]);
            return (
              <article key={engine} className="pricing-bundle-engine-card">
                <header>
                  <h4>{engine}</h4>
                  <button type="button" className="pricing-bundle-select-all" onClick={() => toggleEngine(tools)}>
                    {allSelected ? 'Clear all' : 'Select all'}
                  </button>
                </header>
                <ul>
                  {tools.map((tool) => (
                    <li key={tool.id}>
                      <label>
                        <input
                          type="checkbox"
                          checked={Boolean(selected[tool.id])}
                          onChange={() => toggle(tool.id)}
                        />
                        <span className="pricing-bundle-tool-name">{tool.name}</span>
                        <span className="pricing-bundle-tool-cost">
                          {tool.points_cost === 0 ? 'Free' : `${tool.points_cost} pts`}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>

        <aside className="pricing-bundle-cart">
          <h4>Your bundle</h4>
          {selectedTools.length === 0 ? (
            <p className="pricing-bundle-empty">Pick at least one tool to start building your bundle.</p>
          ) : (
            <ul className="pricing-bundle-cart-list">
              {selectedTools.map((tool) => (
                <li key={tool.id}>
                  <span>{tool.name}</span>
                  <button type="button" aria-label={`Remove ${tool.name}`} onClick={() => toggle(tool.id)}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="pricing-bundle-extra">
            <label htmlFor="bundle-extra-points">Extra points (optional)</label>
            <div className="pricing-bundle-stepper">
              <button
                type="button"
                onClick={() => setExtraPoints((n) => Math.max(0, n - 50))}
                disabled={extraPoints <= 0}
                aria-label="Decrease extra points"
              >
                −
              </button>
              <input
                id="bundle-extra-points"
                type="number"
                min={0}
                step={50}
                value={extraPoints}
                onChange={(e) => setExtraPoints(Math.max(0, Number(e.target.value) || 0))}
              />
              <button type="button" onClick={() => setExtraPoints((n) => n + 50)} aria-label="Increase extra points">
                +
              </button>
            </div>
            <p>A buffer for repeat runs, on top of what your selected tools need.</p>
          </div>

          <div className="pricing-bundle-cycle" role="radiogroup" aria-label="Billing cycle">
            <button
              type="button"
              role="radio"
              aria-checked={billingCycle === 'one_time'}
              className={billingCycle === 'one_time' ? 'is-active' : ''}
              onClick={() => setBillingCycle('one_time')}
            >
              One-time
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={billingCycle === 'monthly'}
              className={billingCycle === 'monthly' ? 'is-active' : ''}
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly
            </button>
          </div>

          <div className="pricing-bundle-total">
            <span>{totalPoints} points total</span>
            <strong>{formatMinor(totalPriceMinor, billables.currency)}</strong>
          </div>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            className="button button-primary"
            disabled={busy || selectedTools.length === 0}
            onClick={() => void getBundle()}
          >
            Get this bundle
          </button>
        </aside>
      </div>
    </div>
  );
}
