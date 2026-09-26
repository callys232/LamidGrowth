import { existsSync } from 'node:fs';
import pg from 'pg';
if (existsSync('.env')) process.loadEnvFile('.env');
if (!process.env.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL is not configured');
const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL, connectionTimeoutMillis: 8000, query_timeout: 8000 });
try { await pool.query('SELECT 1'); console.log('Configured test database is reachable'); }
catch(e) { console.log('Test database unavailable:', e.code || e.message); process.exitCode=1; }
finally { await pool.end(); }
