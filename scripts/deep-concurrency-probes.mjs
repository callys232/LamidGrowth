// Deterministic interleaving probes, not a substitute for PostgreSQL integration tests.
// The asynchronous store permits overlapping reads, as READ COMMITTED does without locks.
import { acquireServiceLease } from '../src/app/operations.mjs';
import { createMailOutbox } from '../src/app/mail.mjs';

const results = [];
for (let attempt = 1; attempt <= 10; attempt++) {
  let lease;
  const store = {
    transaction: async work => work(),
    db: { prepare: () => ({
      get: async () => lease && { ...lease },
      run: async (name, owner, expires_at) => { lease = { name, owner, expires_at }; },
    }) },
  };
  const claims = await Promise.all(['worker-a', 'worker-b', 'worker-c'].map(owner => acquireServiceLease(store, 'scheduler', owner, 100, 100)));
  results.push({ probe: 'scheduler-overlapping-claims', attempt, ownersGranted: claims.filter(Boolean).length, invariantPassed: claims.filter(Boolean).length === 1 });
}
for (let attempt = 1; attempt <= 10; attempt++) {
  let row;
  let sends = 0;
  const store = {
    transaction: async work => work(),
    db: { prepare: sql => ({
      get: async () => row?.status === 'pending' ? { ...row } : undefined,
      run: async (...args) => {
        if (sql.startsWith('INSERT')) row = { id: args[0], payload: args[2], status: 'pending', attempts: 0 };
        if (sql.includes("SET status = 'sending'")) { row.status = 'sending'; row.attempts++; }
        if (sql.includes("SET status = 'sent'")) { row.status = 'sent'; row.payload = ''; }
      },
    }) },
  };
  const mail = createMailOutbox(store, { async send() { sends++; } }, Buffer.alloc(32, 1));
  await mail.enqueue('probe', 'test-user', { to: 'unused@example.test', text: 'No external delivery' }, Date.now() + 60000);
  await Promise.all([mail.tick(), mail.tick(), mail.tick()]);
  results.push({ probe: 'mail-overlapping-claims', attempt, sends, invariantPassed: sends === 1 });
}
console.log(JSON.stringify({ scope: 'Controlled in-memory interleavings of actual production lease/mail functions; no database or external mail calls', results }, null, 2));
process.exitCode = results.every(result => result.invariantPassed) ? 0 : 1;
