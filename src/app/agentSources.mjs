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
  return groups.flat();
}
