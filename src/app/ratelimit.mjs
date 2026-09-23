// Backed by the shared SQLite file (already WAL-mode, busy_timeout=5000) rather than an
// in-memory Map, so counters are correct across multiple cluster worker processes: an
// attacker hammering one IP is capped at `max` total, not `max` per worker.
export function createRateLimiter(
  store,
  { windowMs, max, message, namespace = 'default', key = (req) => req.ip },
) {
  const { db } = store;
  const upsert = db.prepare(`
    INSERT INTO rate_limit_buckets (key, count, reset_at) VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET
      count = CASE WHEN rate_limit_buckets.reset_at <= ? THEN 1 ELSE rate_limit_buckets.count + 1 END,
      reset_at = CASE WHEN rate_limit_buckets.reset_at <= ? THEN ? ELSE rate_limit_buckets.reset_at END
    RETURNING count, reset_at
  `);
  return async (req, res, next) => {
    const now = Date.now();
    const currentKey = `${namespace}:${key(req) || 'unknown'}`;
    const newResetAt = now + windowMs;
    const row = await upsert.get(currentKey, newResetAt, now, now, newResetAt);
    if (row.count > max) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((row.reset_at - now) / 1000))));
      return res.status(429).json({ error: message });
    }
    next();
  };
}

export async function pruneRateLimitBuckets(store) {
  await store.db.prepare('DELETE FROM rate_limit_buckets WHERE reset_at <= ?').run(Date.now());
}
