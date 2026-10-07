import { assessFreshness } from './intelligence.mjs';

// records() returns the stored data, ID and version, but not its database kind.
// Attach the trusted kind from the collection we requested, never from record data.
export async function collectAgentSources(store, workspaceId, extraKinds = []) {
  const kinds = [...new Set(['objective', 'action', ...extraKinds])];
  const groups = await Promise.all(
    kinds.map(async (kind) =>
      (await store.records(workspaceId, kind)).map((record) => ({
        id: record.id,
        version: record.version,
        kind,
        data: record,
      })),
    ),
  );
  return [...groups.flat(), ...(await currentToolResults(store, workspaceId))];
}

/** Catalog tool results that are still current, so an agent builds on what was already
 * calculated instead of ignoring it. Stale results (expired, or a cited source has changed) are
 * left out. Each carries its analytical status, so a provisional or insufficient-evidence result
 * is never presented to the agent as a finished conclusion. */
async function currentToolResults(store, workspaceId) {
  const rows = await store.db
    .prepare(
      "SELECT * FROM intelligence_results WHERE workspace_id = ? AND agent_id LIKE 'tool:%' AND expires_at > ? ORDER BY computed_at DESC LIMIT 50",
    )
    .all(workspaceId, new Date().toISOString());
  const out = [];
  for (const row of rows) {
    if ((await assessFreshness(store, row)).state !== 'current') continue;
    out.push({
      id: `${row.agent_id}:${row.subject_kind}:${row.subject_id}`,
      version: row.version,
      kind: 'tool_result',
      data: {
        tool: row.agent_id.slice('tool:'.length),
        subject: { kind: row.subject_kind, id: row.subject_id },
        status: row.status,
        conclusion: row.conclusion,
        computedAt: row.computed_at,
        result: JSON.parse(row.summary),
      },
    });
  }
  return out;
}
