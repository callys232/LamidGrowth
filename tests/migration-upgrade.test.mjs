import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { openStore, SCHEMA_SQL } from '../server/store.mjs';

test('an existing version 1 database upgrades through the current schema', async (t) => {
  if (!process.env.TEST_DATABASE_URL)
    return t.skip('TEST_DATABASE_URL is required; production databases are never used by tests.');

  const schema = `test_migration_${randomUUID().replaceAll('-', '')}`;
  const hostname = new URL(process.env.TEST_DATABASE_URL).hostname;
  const ssl = ['localhost', '127.0.0.1', '[::1]'].includes(hostname)
    ? false
    : {
        rejectUnauthorized: true,
        ca: readFileSync(new URL('../server/supabase-ca.pem', import.meta.url), 'utf8'),
      };
  const setupPool = new pg.Pool({
    connectionString: process.env.TEST_DATABASE_URL,
    ssl,
    max: 1,
    connectionTimeoutMillis: 10000,
    query_timeout: 20000,
    statement_timeout: 15000,
  });
  let store;

  t.after(async () => {
    if (store) await store.db.close();
    await setupPool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await setupPool.end();
  });

  await setupPool.query(`CREATE SCHEMA "${schema}"`);
  await setupPool.query(`SET search_path TO "${schema}"; ${SCHEMA_SQL}`);
  await setupPool.query('INSERT INTO migrations (version, applied_at) VALUES (1, $1)', [
    new Date().toISOString(),
  ]);

  store = await openStore(schema);
  const applied = await store.db.prepare('SELECT version FROM migrations ORDER BY version').all();

  assert.deepEqual(
    applied.map(({ version }) => version),
    [1, 2, 3],
  );
  assert.equal(
    await store.db
      .prepare(
        "SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = current_schema() AND table_name IN ('workspace_agent_entitlements', 'invoices')",
      )
      .get()
      .then(({ count }) => count),
    2,
  );
});
