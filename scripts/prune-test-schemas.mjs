import pg from 'pg';
import { readFileSync, existsSync } from 'node:fs';
if (existsSync('.env')) process.loadEnvFile('.env');
const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString || connectionString === process.env.DATABASE_URL)
  throw new Error('A separate TEST_DATABASE_URL is required.');
const requested = process.argv.find((arg) => arg.startsWith('--schema='))?.slice(9);
const apply = process.argv.includes('--apply');
const allowed = /^(?:test_[a-f0-9]{12}|test_demo_[a-f0-9]{32})$/;
if (requested && !allowed.test(requested))
  throw new Error('Only an exact disposable test schema name is allowed.');
if (apply && !requested)
  throw new Error('Deletion requires --apply and one exact --schema=test_... name.');
const host = new URL(connectionString).hostname;
const pool = new pg.Pool({
  connectionString,
  max: 1,
  connectionTimeoutMillis: 10000,
  ssl: ['localhost', '127.0.0.1', '[::1]'].includes(host)
    ? false
    : {
        rejectUnauthorized: true,
        ca: readFileSync(new URL('../server/supabase-ca.pem', import.meta.url), 'utf8'),
      },
});
try {
  const { rows } = await pool.query('SELECT nspname FROM pg_namespace ORDER BY nspname');
  const schemas = rows
    .map((row) => row.nspname)
    .filter((name) => allowed.test(name) && (!requested || name === requested));
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', schemas }));
  if (apply && schemas.length === 1) await pool.query(`DROP SCHEMA "${schemas[0]}" CASCADE`);
} finally {
  await pool.end();
}
