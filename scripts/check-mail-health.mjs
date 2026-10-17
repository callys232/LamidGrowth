import { existsSync, readFileSync } from 'node:fs';
import pg from 'pg';
import { mailHealth } from '../src/app/mailOperations.mjs';

pg.types.setTypeParser(20, Number);

if (existsSync('.env')) process.loadEnvFile('.env');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const local = ['localhost', '127.0.0.1', '[::1]'].includes(
  new URL(process.env.DATABASE_URL).hostname,
);
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: local
    ? false
    : {
        rejectUnauthorized: true,
        ca: readFileSync(new URL('../server/supabase-ca.pem', import.meta.url), 'utf8'),
      },
  max: 1,
  connectionTimeoutMillis: 10000,
  query_timeout: 15000,
});
pool.on('error', () => {});
let client;
try {
  client = await pool.connect();
  await client.query('BEGIN READ ONLY');
  await client.query('SET LOCAL search_path TO public');
  const db = {
    prepare(sql) {
      let index = 0;
      const query = sql.replaceAll('?', () => `$${++index}`);
      return {
        async get(...args) {
          return (await client.query(query, args)).rows[0];
        },
        async all(...args) {
          return (await client.query(query, args)).rows;
        },
      };
    },
  };
  const report = await mailHealth({ db });
  report.webhookSecretConfigured = Boolean(process.env.RESEND_WEBHOOK_SECRET);
  if (process.env.RESEND_API_KEY && !report.webhookSecretConfigured) {
    report.warnings.push('Resend webhook signing secret is missing.');
    report.healthy = false;
  }
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.healthy ? 0 : 1;
} catch (error) {
  console.error(
    JSON.stringify({
      healthy: false,
      error: /^[A-Z0-9_]+$/.test(error.code || '') ? error.code : 'mail_health_check_failed',
      action: 'Check database access and deploy the mail schema before monitoring.',
    }),
  );
  process.exitCode = 1;
} finally {
  if (client) {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
  }
  await pool.end();
}
