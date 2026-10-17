import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createDb, createTransaction, SCHEMA_SQL } from '../server/store.mjs';
import { DEMO_SCHEMA_SQL } from '../server/demoSchema.mjs';
import { MAIL_SCHEMA_SQL } from '../server/mailSchema.mjs';

// Service tests need the real schema and adapters, without booting unrelated app migrations.
export async function openDemoTestStore() {
  if (!process.env.TEST_DATABASE_URL || process.env.TEST_DATABASE_URL === process.env.DATABASE_URL)
    throw new Error('A dedicated TEST_DATABASE_URL distinct from production is required.');
  const schema = `test_demo_${randomUUID().replaceAll('-', '')}`;
  const pool = new pg.Pool({
    connectionString: process.env.TEST_DATABASE_URL,
    ssl: ['localhost', '127.0.0.1', '[::1]'].includes(
      new URL(process.env.TEST_DATABASE_URL).hostname,
    )
      ? false
      : {
          rejectUnauthorized: true,
          ca: readFileSync(new URL('../server/supabase-ca.pem', import.meta.url), 'utf8'),
        },
    max: 2,
    connectionTimeoutMillis: 10000,
    query_timeout: 20000,
    statement_timeout: 15000,
  });
  pool.on('error', () => {});
  try {
    await pool.query(
      `CREATE SCHEMA "${schema}"; SET search_path TO "${schema}"; ${SCHEMA_SQL} ${DEMO_SCHEMA_SQL} ${MAIL_SCHEMA_SQL}`,
    );
  } catch (error) {
    await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(() => {});
    await pool.end();
    throw error;
  }
  const db = createDb(pool, schema);
  return {
    db,
    transaction: createTransaction(pool, schema),
    async log(workspace, actor, action, objectId, detail) {
      await db
        .prepare(
          'INSERT INTO audit (id, workspace_id, actor, action, object_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        )
        .run(randomUUID(), workspace, actor, action, objectId, detail, new Date().toISOString());
    },
    async dropSchema() {
      try {
        await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      } finally {
        await pool.end();
      }
    },
  };
}
