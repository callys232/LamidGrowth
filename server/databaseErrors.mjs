const connectionCodes = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EPIPE',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'EAI_AGAIN',
  '57P01',
  '57P02',
  '57P03',
  '53300',
]);
export function isDatabaseConnectionError(error) {
  return (
    connectionCodes.has(error?.code) ||
    /^08\w{3}$/.test(error?.code || '') ||
    /connection terminated|connection timeout|timeout exceeded when trying to connect|connection error and is not queryable|query read timeout/i.test(
      error?.message || '',
    )
  );
}
export function markDatabaseError(error, pool) {
  if (error && typeof error === 'object') {
    error.databaseFailure = true;
    if (pool)
      error.databasePool = {
        total: pool.totalCount || 0,
        idle: pool.idleCount || 0,
        waiting: pool.waitingCount || 0,
      };
  }
  return error;
}
export function databaseFailureResponse(error, { readOnly = false } = {}) {
  if (
    !error?.databaseFailure ||
    !(isDatabaseConnectionError(error) || ['57014', '55P03'].includes(error.code))
  )
    return null;
  return {
    status: 503,
    code: 'DATABASE_UNAVAILABLE',
    retryAfter: 3,
    message:
      error.commitOutcomeUnknown && !readOnly
        ? 'The database connection was interrupted while saving. Check whether your change was saved before trying again.'
        : 'The database is temporarily unavailable. Please try again shortly.',
  };
}

// Retry acquisition only, before any application statement can have run.
// Request-path calls keep one attempt; startup may opt into two bounded attempts.
export async function acquireDatabaseClient(
  pool,
  { attempts = 1, wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {},
) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await pool.connect();
    } catch (error) {
      markDatabaseError(error, pool);
      if (attempt >= attempts || pool.waitingCount > 0 || !isDatabaseConnectionError(error))
        throw error;
      await wait(150 + Math.floor(Math.random() * 150));
    }
  }
}
