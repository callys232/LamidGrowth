import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../shared/ui/Button';
import { Empty } from '../../../shared/ui/Empty';
import { Field } from '../../../shared/ui/Field';
import { StatusPill } from '../../../shared/workspace/StatusPill';
import { usePricingPage } from '../hooks/usePricingPage';
import { clearPendingBundle, readPendingBundle } from '../pendingBundle';

function formatMinor(amountMinor: number, currency: string) {
  return `${(amountMinor / 100).toFixed(2)} ${currency}`;
}

/** /os/pricing — kept to the one thing every member needs here: buying points, plus browsing
 * published bundles. The tool/engine price list and bundle-authoring tools (ecosystem-admin
 * only) live under the "Create a Bundle" tab instead of being shown to every visitor by default.
 * `pendingBundle` closes the loop for someone who built a custom bundle on the public /pricing
 * page before they had an account: it prefills the points amount here and is cleared once shown,
 * whether or not they actually buy — it's a one-time handoff, not something to keep re-surfacing. */
export function PricingBillablesPage() {
  const page = usePricingPage();
  const [pendingBundle, setPendingBundle] = useState(readPendingBundle);
  const [customPoints, setCustomPoints] = useState(() => pendingBundle?.totalPoints ?? 100);
  const [tab, setTab] = useState<'points' | 'bundle'>('points');

  function dismissPendingBundle() {
    clearPendingBundle();
    setPendingBundle(null);
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Pricing</h2>
          <span>Buy points for this workspace, or see what each billable costs.</span>
        </div>
      </div>

      {page.error && (
        <p className="form-error" role="alert">
          {page.error}
        </p>
      )}

      <div className="pricing-tabs" role="tablist" aria-label="Pricing sections">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'points'}
          className={tab === 'points' ? 'is-active' : ''}
          onClick={() => setTab('points')}
        >
          Buy points
        </button>
        {page.isEcosystemAdmin && (
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'bundle'}
            className={tab === 'bundle' ? 'is-active' : ''}
            onClick={() => setTab('bundle')}
          >
            Create a Bundle
          </button>
        )}
      </div>

      {tab === 'points' && (
        <>
          {pendingBundle && (
            <section className="panel settings-card">
              <h3>Your custom bundle</h3>
              <p>
                From the bundle you built before signing in: {pendingBundle.toolNames.join(', ')}
                {pendingBundle.extraPoints > 0 && (
                  <> plus {pendingBundle.extraPoints} extra points</>
                )}
                . We've filled in the total below — {pendingBundle.totalPoints} points.
              </p>
              <Button variant="ghost" onClick={dismissPendingBundle}>
                Dismiss
              </Button>
            </section>
          )}
          <section className="panel settings-card">
            <h3>Buy points</h3>
            <p>
              Points cover every billable tool and engine call.
              {page.billables && (
                <>
                  {' '}
                  1 point costs{' '}
                  {formatMinor(page.billables.pointsUnitPriceMinor, page.billables.currency)}. See
                  what each tool costs on the <Link to="/pricing">pricing page</Link>.
                </>
              )}
            </p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <Field label="Points">
                <input
                  type="number"
                  min={1}
                  max={100000}
                  value={customPoints}
                  onChange={(e) => setCustomPoints(Number(e.target.value))}
                />
              </Field>
              <Button
                disabled={page.busy || customPoints < 1}
                onClick={() => {
                  if (pendingBundle) clearPendingBundle();
                  void page.purchasePoints(customPoints);
                }}
              >
                Buy {customPoints} points
              </Button>
            </div>
          </section>

          <section className="panel settings-card">
            <h3>Bundles</h3>
            <p>A bundle packages a points allotment and a set of tools into one price.</p>
            {page.bundles.length === 0 ? (
              <Empty title="No bundles published yet">Published bundles will appear here.</Empty>
            ) : (
              <ol className="activity-feed-list">
                {page.bundles.map((bundle) => (
                  <li key={bundle.id} className="activity-feed-row">
                    <span className="activity-feed-title">
                      <strong>{bundle.name}</strong>
                      <br />
                      <small>
                        {bundle.description} · {bundle.points_included} points ·{' '}
                        {bundle.billing_cycle === 'monthly' ? 'per month' : 'one-time'}
                        {bundle.items.length > 0 && (
                          <> · includes {bundle.items.map((i) => i.name).join(', ')}</>
                        )}
                      </small>
                    </span>
                    <StatusPill status={formatMinor(bundle.price_minor, bundle.currency)} />
                    <Button
                      disabled={page.busy}
                      onClick={() => void page.purchaseBundle(bundle.id)}
                    >
                      Buy bundle
                    </Button>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}

      {tab === 'bundle' && page.isEcosystemAdmin && (
        <>
          <section className="panel settings-card">
            <h3>Billables</h3>
            <p>
              Every registered tool and engine is billed the same way the Companion runs it — in
              points.
              {page.billables && (
                <>
                  {' '}
                  1 point costs{' '}
                  {formatMinor(page.billables.pointsUnitPriceMinor, page.billables.currency)}.
                </>
              )}
            </p>
            {!page.billables ? (
              <Empty title="Loading billables…">
                Fetching the current tool and engine price list.
              </Empty>
            ) : (
              <ol className="activity-feed-list">
                {page.billables.tools.map((tool) => (
                  <li key={tool.id} className="activity-feed-row">
                    <span className="activity-feed-title">
                      <strong>{tool.name}</strong>
                      <br />
                      <small>
                        {tool.home_engine} · {tool.max_authority} · human gate: {tool.human_gate}
                      </small>
                    </span>
                    <StatusPill
                      status={`${tool.points_cost} pt${tool.points_cost === 1 ? '' : 's'}`}
                    />
                  </li>
                ))}
                <li className="activity-feed-row">
                  <span className="activity-feed-title">
                    <strong>{page.billables.deepReview.name}</strong>
                    <br />
                    <small>{page.billables.deepReview.description}</small>
                  </span>
                  <StatusPill status={`${page.billables.deepReview.pointsCost} pts`} />
                </li>
              </ol>
            )}
          </section>

          <section className="panel settings-card">
            <h3>Bundle builder</h3>
            <p>Create a new bundle from the billables above.</p>
            <form onSubmit={page.createBundle}>
              <Field label="Name">
                <input name="name" required maxLength={120} placeholder="e.g. Growth Starter" />
              </Field>
              <Field label="Description">
                <input name="description" maxLength={2000} placeholder="What this bundle is for" />
              </Field>
              <Field label="Price (USD)">
                <input name="price" type="number" min={0.01} step="0.01" required />
              </Field>
              <Field label="Points included">
                <input name="pointsIncluded" type="number" min={0} required defaultValue={0} />
              </Field>
              <Field label="Billing cycle">
                <select name="billingCycle" defaultValue="one_time">
                  <option value="one_time">One-time</option>
                  <option value="monthly">Monthly</option>
                </select>
              </Field>
              <Field
                label="Included tools & engines"
                hint="Select every tool this bundle grants access to"
                style={{ gridColumn: '1 / -1' }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    maxHeight: 220,
                    overflowY: 'auto',
                  }}
                >
                  {page.billables?.tools.map((tool) => (
                    <label
                      key={tool.id}
                      style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}
                    >
                      <input
                        type="checkbox"
                        checked={page.selectedAgentIds.includes(tool.id)}
                        onChange={() => page.toggleAgent(tool.id)}
                      />
                      {tool.name} ({tool.home_engine}, {tool.points_cost} pt
                      {tool.points_cost === 1 ? '' : 's'})
                    </label>
                  ))}
                </div>
              </Field>
              <Button type="submit" disabled={page.busy}>
                Create bundle (draft)
              </Button>
            </form>
          </section>

          {page.adminBundles.length > 0 && (
            <section className="panel settings-card">
              <h3>Manage bundles</h3>
              <p>Publish a draft bundle to make it purchasable, or archive one to retire it.</p>
              <ol className="activity-feed-list">
                {page.adminBundles.map((bundle) => (
                  <li key={bundle.id} className="activity-feed-row">
                    <span className="activity-feed-title">
                      <strong>{bundle.name}</strong>
                      <br />
                      <small>
                        {formatMinor(bundle.price_minor, bundle.currency)} ·{' '}
                        {bundle.points_included} points · {bundle.billing_cycle}
                      </small>
                    </span>
                    <StatusPill status={bundle.status} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      {bundle.status !== 'active' && (
                        <Button
                          variant="secondary"
                          disabled={page.busy}
                          onClick={() => void page.setBundleStatus(bundle.id, 'active')}
                        >
                          Publish
                        </Button>
                      )}
                      {bundle.status !== 'archived' && (
                        <Button
                          variant="secondary"
                          disabled={page.busy}
                          onClick={() => void page.setBundleStatus(bundle.id, 'archived')}
                        >
                          Archive
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        disabled={page.busy}
                        onClick={() => void page.deleteBundle(bundle.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </>
      )}
    </section>
  );
}
