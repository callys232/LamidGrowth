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
  if (
    env.MAIL_REQUESTS_PER_SECOND &&
    (!Number.isInteger(Number(env.MAIL_REQUESTS_PER_SECOND)) ||
      Number(env.MAIL_REQUESTS_PER_SECOND) < 1 ||
      Number(env.MAIL_REQUESTS_PER_SECOND) > 100)
  )
    throw new Error(
      'MAIL_REQUESTS_PER_SECOND must be an integer between 1 and 100 matching your provider limit.',
    );
  if (
    env.RESEND_WEBHOOK_SECRET &&
    (!/^whsec_[A-Za-z0-9+/]+={0,2}$/.test(env.RESEND_WEBHOOK_SECRET) ||
      Buffer.from(env.RESEND_WEBHOOK_SECRET.slice(6), 'base64').length < 16)
  )
    throw new Error('RESEND_WEBHOOK_SECRET must be the signing secret supplied by Resend.');
  if (env.RETENTION_ENABLED === 'true')
    for (const name of ['DEMO_RETENTION_DAYS', 'MAIL_RETENTION_DAYS'])
      if (
        !Number.isInteger(Number(env[name])) ||
        Number(env[name]) < 30 ||
        Number(env[name]) > 3650
      )
        throw new Error(
          `${name} must be configured between 30 and 3650 days before enabling retention.`,
        );
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
  const origins = (env.FRONTEND_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  for (const value of [
    ...origins,
    ...(env.DEMO_PUBLIC_ORIGIN ? [env.DEMO_PUBLIC_ORIGIN] : []),
    ...(env.ACCOUNT_PUBLIC_ORIGIN ? [env.ACCOUNT_PUBLIC_ORIGIN] : []),
  ]) {
    let frontend;
    try {
      frontend = new URL(value);
    } catch {
      throw new Error('Frontend and demo origins must be valid HTTPS origins.');
    }
    if (
      frontend.protocol !== 'https:' ||
      frontend.username ||
      frontend.password ||
      frontend.pathname !== '/' ||
      frontend.search ||
      frontend.hash
    )
      throw new Error(
        'Frontend and demo origins must be HTTPS origins without paths, credentials, queries or fragments.',
      );
  }
  if (
    env.DEMO_PUBLIC_ORIGIN &&
    new URL(env.DEMO_PUBLIC_ORIGIN).origin !== url.origin &&
    !origins.includes(new URL(env.DEMO_PUBLIC_ORIGIN).origin)
  )
    throw new Error(
      'Include DEMO_PUBLIC_ORIGIN in FRONTEND_ORIGINS for the split frontend/API deployment.',
    );
  if (
    env.ACCOUNT_PUBLIC_ORIGIN &&
    new URL(env.ACCOUNT_PUBLIC_ORIGIN).origin !== url.origin &&
    !origins.includes(new URL(env.ACCOUNT_PUBLIC_ORIGIN).origin)
  )
    throw new Error(
      'Include ACCOUNT_PUBLIC_ORIGIN in FRONTEND_ORIGINS for the split frontend/API deployment.',
    );
}
