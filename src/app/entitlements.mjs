/**
 * Real entitlement gating for billable tools (the 30 chat agents in agents.mjs, plus the 248
 * ported diagnostic engines in engines.mjs — both live in the shared `agent_manifests` table).
 *
 * Before this, every tool was gated purely by points balance; buying a bundle only topped up
 * points, even though `bundle_items` (and the bundle-builder UI's own copy) already implied
 * bundles "grant access." This module makes that real: a workspace can run a paid tool only if
 * its tier or an actually-completed bundle purchase includes it. Points charging is unchanged —
 * this is an access gate layered before it, not a replacement.
 */

/** Called from the Paystack webhook once a bundle purchase is confirmed (charge.success) — never
 * from the purchase-initiation route, since a pending/unpaid purchase must not grant access. */
export async function grantBundleEntitlements(store, workspaceId, bundleId) {
  const items = await store.db.prepare('SELECT agent_id FROM bundle_items WHERE bundle_id = ?').all(bundleId);
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
 * Everything else needs a real entitlement row. */
export async function hasToolAccess(store, workspace, agentId) {
  if (workspace.tier === 'enterprise') return true;
  const manifest = await store.db.prepare('SELECT points_cost FROM agent_manifests WHERE id = ?').get(agentId);
  if (manifest && manifest.points_cost === 0) return true;
  const row = await store.db
    .prepare('SELECT 1 FROM workspace_agent_entitlements WHERE workspace_id = ? AND agent_id = ? LIMIT 1')
    .get(workspace.id, agentId);
  return Boolean(row);
}
