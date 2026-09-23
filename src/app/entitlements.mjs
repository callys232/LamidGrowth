import { MODULE_REGISTRY, CONTEXT_RANK } from './engineRegistry.mjs';

/**
 * Real entitlement gating for billable tools (the 30 chat agents in agents.mjs, plus the 248
 * ported diagnostic engines in engines.mjs — both live in the shared `agent_manifests` table).
 *
 * Before this, every tool was gated purely by points balance; buying a bundle only topped up
 * points, even though `bundle_items` (and the bundle-builder UI's own copy) already implied
 * bundles "grant access." This module makes that real: a workspace can run a paid tool only if
 * its tier, its signup context, or an actually-completed bundle purchase includes it. Points
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

/** Enterprise tier gets everything. A free (points_cost = 0) tool is available to everyone —
 * none of the 248 new engines are free, so this can't be used to route around bundle-gating them.
 * For the 248 engines specifically, the workspace's signup context is also checked against the
 * engine's minContextRank (see engineRegistry.mjs) — a higher context sees everything a lower one
 * does. A workspace can still unlock an engine above its own context by owning a bundle that
 * includes it (the entitlement-row check below applies regardless of context). */
export async function hasToolAccess(store, workspace, agentId) {
  if (workspace.tier === 'enterprise') return true;
  const manifest = await store.db
    .prepare('SELECT points_cost FROM agent_manifests WHERE id = ?')
    .get(agentId);
  if (manifest && manifest.points_cost === 0) return true;
  if (ENGINE_CODE_PATTERN.test(agentId)) {
    const config = MODULE_REGISTRY[agentId.toUpperCase()];
    const workspaceRank = CONTEXT_RANK[workspace.context] ?? CONTEXT_RANK.Individual;
    if (config && workspaceRank >= config.minContextRank) return true;
  }
  const row = await store.db
    .prepare(
      'SELECT 1 FROM workspace_agent_entitlements WHERE workspace_id = ? AND agent_id = ? LIMIT 1',
    )
    .get(workspace.id, agentId);
  return Boolean(row);
}

/** The same rule as hasToolAccess, applied to every registered engine code at once (one query
 * instead of 248) — used to filter the in-app engine catalog (GET /api/engines) down to what a
 * workspace can actually see, per "a user only learns of all 248 tools from the public marketing
 * pages; the in-app catalog only shows what their account can use." Bundle-granted engines above
 * the workspace's own context are included too, so a workspace never loses sight of something it
 * actually paid for. */
export async function accessibleEngineCodes(store, workspace) {
  if (workspace.tier === 'enterprise') return new Set(Object.keys(MODULE_REGISTRY));
  const workspaceRank = CONTEXT_RANK[workspace.context] ?? CONTEXT_RANK.Individual;
  const entitled = await store.db
    .prepare('SELECT agent_id FROM workspace_agent_entitlements WHERE workspace_id = ?')
    .all(workspace.id);
  const entitledCodes = new Set(entitled.map((row) => row.agent_id.toUpperCase()));
  const accessible = new Set();
  for (const [code, config] of Object.entries(MODULE_REGISTRY)) {
    if (workspaceRank >= config.minContextRank || entitledCodes.has(code)) accessible.add(code);
  }
  return accessible;
}
