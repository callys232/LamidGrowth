// Share the in-flight query so health polling cannot exhaust the database pool.
export function createReadinessCheck(store, timeoutMs = 5000) {
  let pending;
  return async () => {
    if (!pending) {
      pending = store.db.prepare('SELECT 1 AS ready').get();
      pending
        .finally(() => {
          pending = undefined;
        })
        .catch(() => {});
    }
    let timer;
    try {
      await Promise.race([
        pending,
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('Database readiness timed out.')), timeoutMs);
        }),
      ]);
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  };
}
