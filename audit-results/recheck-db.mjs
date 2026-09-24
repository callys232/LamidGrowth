import pg from 'pg';
for (const port of [55433, 55432]) {
  const pool = new pg.Pool({ connectionString: `postgresql://lamid_test:local_audit_only@127.0.0.1:${port}/lamid_test?sslmode=disable`, connectionTimeoutMillis: 3000, query_timeout: 3000 });
  try { await pool.query('SELECT 1'); console.log(`${port}: ready`); }
  catch (e) { console.log(`${port}: ${e.code || e.message}`); }
  finally { await pool.end(); }
}
