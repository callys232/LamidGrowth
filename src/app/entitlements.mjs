import { MODULE_REGISTRY } from './engineRegistry.mjs';
import { seatsFor, effectivePlan } from './plans.mjs';

/**
 * Real entitlement gating for billable tools (the 30 chat agents in agents.mjs, plus the 248
 * ported diagnostic engines in engines.mjs — both live in the shared `agent_manifests` table).
 *
 * Before this, every tool was gated purely by points balance; buying a bundle only topped up
 * points, even though `bundle_items` (and the bundle-builder UI's own copy) already implied
 * bundles "grant access." This module makes that real: a workspace can run a paid tool only if
 * its plan (src/app/plans.mjs), its tier, or an actually-completed bundle purchase includes it. Points
 * charging is unchanged — this is an access gate layered before it, not a replacement.
 */

const ENGINE_CODE_PATTERN = /^[a-z]\d{2,3}$/;

/** Called from the Paystack webhook once a bundle purchase is confirmed (charge.success) — never
 * from the purchase-initiation route, since a pending/unpaid purchase must not grant access. */
export async function grantBundleEntitlements(store, workspaceId, bundleId) {
  const items = await store.db
    .prepare('SELECT agent_id FROM bundle_items WHERE bundle_id = ?')
    .all(bundleId);
  const grantedAt = new Date().toISOString();
  for (const item of items) {
    await store.db
      .prepare(
        'INSERT INTO workspace_agent_entitlements VALUES (?, ?, ?, ?) ON CONFLICT (workspace_id, agent_id, source) DO NOTHING',
      )
      .run(workspaceId, item.agent_id, `bundle:${bundleId}`, grantedAt);
  }
}

/** Enterprise tier or plan gets everything. A free (points_cost = 0) tool is available to
 * everyone — no catalog tool is free, so this can't be used to route around plan gating. For
 * catalog tools, the workspace's plan decides: a tool opens when its seat (home_engine) is in the
 * plan, a paid add-on seat, or a seat kept from before plans existed (plans.mjs seatsFor). A seat
 * bought as a one-time bundle still grants its tools through the entitlement rows below. The
 * signup context no longer decides access. */
export async function hasToolAccess(store, workspace, agentId) {
  if (workspace.tier === 'enterprise') return true;
  const manifest = await store.db
    .prepare('SELECT points_cost FROM agent_manifests WHERE id = ?')
    .get(agentId);
  if (manifest && manifest.points_cost === 0) return true;
  if (effectivePlan(workspace) === 'enterprise') return true;
  if (ENGINE_CODE_PATTERN.test(agentId)) {
    const config = MODULE_REGISTRY[agentId.toUpperCase()];
    if (config && seatsFor(workspace).has(config.home_engine)) return true;
  }
  const row = await store.db
    .prepare(
      'SELECT 1 FROM workspace_agent_entitlements WHERE workspace_id = ? AND agent_id = ? LIMIT 1',
    )
    .get(workspace.id, agentId);
  return Boolean(row);
}

/** The same rule as hasToolAccess, applied to every registered engine code at once (one query)
 * — used to filter the in-app tool catalog (GET /api/engines) down to what a workspace can use.
 * Bundle-granted tools outside the plan's seats are included too, so a workspace never loses
 * sight of something it actually paid for. */
export async function accessibleEngineCodes(store, workspace) {
  if (effectivePlan(workspace) === 'enterprise') return new Set(Object.keys(MODULE_REGISTRY));
  const seats = seatsFor(workspace);
  const entitled = await store.db
    .prepare('SELECT agent_id FROM workspace_agent_entitlements WHERE workspace_id = ?')
    .all(workspace.id);
  const entitledCodes = new Set(entitled.map((row) => row.agent_id.toUpperCase()));
  const accessible = new Set();
  for (const [code, config] of Object.entries(MODULE_REGISTRY)) {
    if (seats.has(config.home_engine) || entitledCodes.has(code)) accessible.add(code);
  }
  return accessible;
}
