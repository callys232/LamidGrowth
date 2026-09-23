// A single atomic statement, not read-then-write: the earlier version SELECTed the current lease
// and only then decided whether to INSERT/UPDATE, in a separate statement — two workers could
// both see "no active lease" and both proceed, with the second's unconditional DO UPDATE silently
// overwriting the first's legitimately-acquired lease. The WHERE clause on DO UPDATE makes the
// steal conditional on the *current* (not previously-read) row, so only one racing caller's
// update actually applies; a rejected attempt returns no row and this returns false.
export async function acquireServiceLease(store, name, owner, now = Date.now(), ttl = 10000) {
  const result = await store.db
    .prepare(
      `INSERT INTO service_leases (name, owner, expires_at) VALUES (?, ?, ?)
     ON CONFLICT (name) DO UPDATE SET owner = excluded.owner, expires_at = excluded.expires_at
     WHERE service_leases.owner = excluded.owner OR service_leases.expires_at <= ?`,
    )
    .run(name, owner, now + ttl, now);
  return result.changes === 1;
}

export function validateProductionConfig(env = process.env) {
  if (!/^[a-f0-9]{64}$/i.test(env.ACCOUNT_SECURITY_KEY || ''))
    throw new Error('Set ACCOUNT_SECURITY_KEY to 32 random bytes in hex.');
  const url = new URL(env.PUBLIC_ORIGIN || 'http://invalid');
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  )
    throw new Error('Set PUBLIC_ORIGIN to the public HTTPS origin.');
  if (env.COOKIE_SECURE === 'false') throw new Error('Production cookies must be Secure.');
  if ((!env.RESEND_API_KEY && !env.SENDGRID_API_KEY) || !env.MAIL_FROM)
    throw new Error(
      'Configure RESEND_API_KEY or SENDGRID_API_KEY, plus MAIL_FROM, before starting public production.',
    );
  if (env.TRUST_PROXY_HOPS && !/^[1-9]\d*$/.test(env.TRUST_PROXY_HOPS))
    throw new Error('TRUST_PROXY_HOPS must match a positive number of trusted proxy hops.');
  if (!env.DATABASE_URL) throw new Error('Set DATABASE_URL to your Postgres connection string.');
}
