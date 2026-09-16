import { existsSync, readFileSync } from 'node:fs';
if (existsSync('.env')) process.loadEnvFile('.env');
import pg from 'pg';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// See the identical comment in server/store.mjs — Supabase's pooler needs its own root CA pinned
// for real certificate verification, not rejectUnauthorized: false.
const sslConfig = { rejectUnauthorized: true, ca: readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../server/supabase-ca.pem'), 'utf8') };

// Safety net, not the primary cleanup mechanism: every test file's own after()/t.after() hook
// drops its disposable schema when it exits normally. This exists for the case that mechanism
// can't cover — a crashed or forcibly-killed test process skips its own cleanup hooks entirely,
// leaking a schema that otherwise sits there forever. Run this before a CI test job (or by hand
// after killing a hung test run) to reclaim that space. Must run against TEST_DATABASE_URL, never
// DATABASE_URL — this is destructive and only ever safe against the disposable test database.
const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) {
  console.error('TEST_DATABASE_URL is not set; refusing to guess which database to prune.');
  process.exit(1);
}

const KEEP = new Set(['public', 'information_schema', 'realtime', 'extensions', 'vault', 'graphql_public', 'graphql', 'auth', 'storage', 'pgsodium', 'pgsodium_masks', 'pgbouncer', 'cron', 'net']);
const olderThanMs = Number(process.argv[2]) || 60 * 60 * 1000; // default: 1 hour

const pool = new pg.Pool({ connectionString, ssl: sslConfig, max: 1 });
try {
  // schema_name has no creation timestamp of its own, so age is inferred from each schema's own
  // `migrations` table (written once, at creation, by openStore's initial migration run).
  const { rows: schemas } = await pool.query(
    `SELECT nspname AS schema_name FROM pg_namespace WHERE nspname NOT LIKE 'pg_%'`,
  );
  let dropped = 0;
  const cutoff = Date.now() - olderThanMs;
  for (const { schema_name: schema } of schemas) {
    if (KEEP.has(schema)) continue;
    let appliedAt = null;
    try {
      const result = await pool.query(`SELECT applied_at FROM "${schema}".migrations WHERE version = 1`);
      appliedAt = result.rows[0]?.applied_at ? Date.parse(result.rows[0].applied_at) : null;
    } catch {
      // No migrations table (schema creation failed mid-way, or predates this scheme) — treat as
      // stale and eligible for pruning rather than leaving an un-owned schema behind forever.
      appliedAt = 0;
    }
    if (appliedAt === null || appliedAt <= cutoff) {
      await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      dropped++;
      console.log(`Dropped stale schema: ${schema}`);
    }
  }
  console.log(`Pruned ${dropped} stale test schema(s).`);
} finally {
  await pool.end();
}
