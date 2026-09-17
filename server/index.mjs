import os from 'node:os';
import { existsSync } from 'node:fs';

// Local convenience only: real deployments should inject secrets directly into the
// environment rather than shipping a .env file. Safe no-op when the file is absent.
if (existsSync('.env')) process.loadEnvFile('.env');

// Must be set before the first async crypto/fs call (which only happens later, at request
// time) — raising this from libuv's default of 4 lets password hashing (scrypt) scale with
// CPU count instead of serializing behind 4 threadpool slots no matter the core count.
process.env.UV_THREADPOOL_SIZE = String(Math.min(128, Math.max(4, os.cpus().length)));

import cluster from 'node:cluster';
import { createApp } from '../src/app/app.mjs';
import { mountFrontend } from '../src/app/frontend.mjs';
import { pruneRateLimitBuckets } from '../src/app/ratelimit.mjs';
import { acquireServiceLease, validateProductionConfig } from '../src/app/operations.mjs';
import { randomUUID } from 'node:crypto';

const production = process.argv.includes('--production');
if (production) validateProductionConfig();
const clusterEnabled = process.env.CLUSTER === 'true' || (production && process.env.CLUSTER !== 'false');
const workerCount = Math.max(
  1,
  Math.min(16, Number.parseInt(process.env.WEB_CONCURRENCY || '', 10) || os.cpus().length),
);
// Every worker (primary or forked) opens its own Postgres pool against the same connection
// string, so PG_POOL_MAX is a fleet-wide budget that must be divided across however many
// processes are actually running — not applied per-process, or clustering would multiply total
// connections by worker count and blow through Supabase's Session Pooler cap.
const effectiveWorkers = clusterEnabled ? workerCount : 1;
const poolMax = Math.max(1, Math.floor((Number(process.env.PG_POOL_MAX) || 10) / effectiveWorkers));

if (clusterEnabled && cluster.isPrimary && workerCount > 1) {
  console.log(`LAMID ONE primary ${process.pid} forking ${workerCount} workers.`);
  let shuttingDown = false;
  for (let i = 0; i < workerCount; i++) cluster.fork();
  cluster.on('exit', (worker, code, signal) => {
    if (shuttingDown) return;
    console.error(`Worker ${worker.process.pid} exited (${signal || code}); restarting.`);
    cluster.fork();
  });
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.on(signal, () => {
      shuttingDown = true;
      for (const worker of Object.values(cluster.workers)) worker.process.kill(signal);
      process.exit(0);
    });
} else {
  await startServer();
}

async function startServer() {
  // No `filename` passed: Postgres has no file-path concept, so this always targets the
  // database's default 'public' schema (see openStore in server/store.mjs) — the equivalent of
  // the old DATABASE_PATH-based single real SQLite file.
  // Only set when the frontend is hosted separately (e.g. Vercel) from this API server —
  // comma-separated exact origins (scheme + host, no trailing slash), never '*' since the API
  // relies on credentialed (cookie-based) requests.
  const allowedOrigins = (process.env.FRONTEND_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const { app, store, runtime, agentRuntime, mail } = await createApp({
    production,
    poolMax,
    allowedOrigins,
  });
  const frontend = await mountFrontend(app, { production });
  const port = Number(process.env.PORT || 3000);
  const server = app.listen(port, '127.0.0.1', () =>
    console.log(`LAMID ONE is ready at http://localhost:${port}`),
  );

  // A renewable database lease elects the scheduler; replacement workers can take over.
  const owner = randomUUID();
  // setInterval does not wait for an async callback to resolve before scheduling the next one —
  // a tick slower than 1000ms (real DB latency, a large reconcile batch) would otherwise overlap
  // its own successor. Since both overlapping calls share this process's own `owner`,
  // acquireServiceLease's same-owner branch lets both through — the lease only stops a *different*
  // process from stealing the slot, not this one from re-entering itself. Same in-flight guard as
  // mailWorker below.
  let ticking = null;
  const worker = setInterval(() => {
    if (ticking) return;
    ticking = (async () => {
      try {
        if (!(await acquireServiceLease(store, 'workflow-scheduler', owner))) return;
        await runtime.tick();
        await agentRuntime.reconcile();
      } catch (error) {
        console.error('Workflow worker failed:', error);
      }
    })().finally(() => { ticking = null; });
  }, 1000);
  worker?.unref();
  let delivering = null;
  const mailWorker = setInterval(() => {
    if (!delivering) delivering = mail.tick().catch(() => console.error('Mail queue processing failed.')).finally(() => { delivering = null; });
  }, 1000);
  mailWorker.unref();

  // Safe for every process to run redundantly — a plain indexed DELETE, not a business
  // action — so no cluster-leader guard is needed here (unlike the ticker above).
  const sweep = setInterval(async () => {
    try {
      await pruneRateLimitBuckets(store);
    } catch (error) {
      console.error('Rate limit bucket sweep failed:', error);
    }
  }, 60_000);
  sweep.unref();

  for (const signal of ['SIGINT', 'SIGTERM'])
    process.on(signal, () => {
      if (worker) clearInterval(worker);
      clearInterval(mailWorker);
      clearInterval(sweep);
      server.close(async () => {
        if (delivering) await delivering;
        await store.db.prepare("DELETE FROM service_leases WHERE owner = ? AND name != 'daily-backup'").run(owner);
        await frontend.close();
        await store.db.close();
        process.exit(0);
      });
    });
}
