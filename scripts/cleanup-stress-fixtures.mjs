// Only removes schemas whose entire user population matches this audit's synthetic fixtures.
// Never considers public/named schemas, and never prints connection strings.
import pg from 'pg';
import { readFileSync } from 'node:fs';
import '../server/store.mjs';
if (!process.env.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL required');
const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL, ssl: { ca: readFileSync('server/supabase-ca.pem', 'utf8'), rejectUnauthorized: true }, max: 1, connectionTimeoutMillis: 10000, query_timeout: 15000 });
try {
  const applying = process.argv.includes('--apply');
  const targets = process.argv.slice(2).filter(value => /^test_[a-f0-9]{12}$/.test(value));
  if (applying && !targets.length) throw new Error('Apply requires exact schema names reviewed in a preview.');
  const schemas = (await pool.query("SELECT n.nspname FROM pg_namespace n JOIN pg_class c ON c.relnamespace=n.oid WHERE n.nspname ~ '^test_[a-f0-9]{12}$' AND c.relname='users' AND c.relkind='r'" + (applying ? ' AND n.nspname = ANY($1::text[])' : ''), applying ? [targets] : [])).rows;
  for (const { nspname } of schemas) {
    if (!/^test_[a-f0-9]{12}$/.test(nspname)) continue;
    const rows = (await pool.query(`SELECT name, email FROM "${nspname}".users`)).rows;
    const isWorker = rows.length === 1 && rows[0].name === 'Isolated race fixture' && rows[0].email === null;
    const isSpending = rows.length === 1 && rows[0].name === 'Spending fixture' && rows[0].email === null;
    const isRewards = rows.length === 9 && rows.every(r => r.name === 'Reward fixture' && /^[a-f0-9-]{36}@example\.test$/.test(r.email));
    if (!(isWorker || isSpending || isRewards)) continue;
    console.log(JSON.stringify({ schema: nspname, fixtureUsers: rows.length, action: process.argv.includes('--apply') ? 'remove' : 'candidate' }));
    if (process.argv.includes('--apply')) await pool.query(`DROP SCHEMA "${nspname}" CASCADE`);
  }
} finally { await pool.end(); }
