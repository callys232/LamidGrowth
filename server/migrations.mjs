/** Apply ordered migrations inside the caller's transaction. */
export async function applyMigrations(client, migrations) {
  let previousVersion = 0;
  for (const migration of migrations) {
    if (
      !Number.isSafeInteger(migration.version) ||
      migration.version <= previousVersion ||
      typeof migration.name !== 'string' ||
      !migration.name ||
      typeof migration.up !== 'function'
    )
      throw new Error(
        'Database migrations must have increasing versions, names, and up functions.',
      );
    previousVersion = migration.version;
  }

  const result = await client.query('SELECT version FROM migrations ORDER BY version');
  const applied = new Set(result.rows.map(({ version }) => Number(version)));
  const latestKnownVersion = migrations.at(-1)?.version ?? 0;
  const unknownVersions = [...applied].filter((version) => version > latestKnownVersion);
  if (unknownVersions.length)
    throw new Error(
      `Database schema version ${Math.max(...unknownVersions)} is newer than this application supports (latest ${latestKnownVersion}).`,
    );

  let missingPriorVersion = false;
  for (const migration of migrations) {
    if (applied.has(migration.version)) {
      if (missingPriorVersion)
        throw new Error(
          `Database migration history is incomplete: version ${migration.version} is applied after a missing earlier version.`,
        );
    } else {
      missingPriorVersion = true;
    }
  }

  for (const migration of migrations) {
    if (applied.has(migration.version)) continue;
    await migration.up(client);
    await client.query('INSERT INTO migrations (version, applied_at) VALUES ($1, $2)', [
      migration.version,
      new Date().toISOString(),
    ]);
  }
}
