import os from 'node:os';

// Must be set before the first async crypto/fs call (which only happens later, at request
// time) — raising this from libuv's default of 4 lets password hashing (scrypt) scale with
// CPU count instead of serializing behind 4 threadpool slots no matter the core count.
process.env.UV_THREADPOOL_SIZE = String(Math.min(128, Math.max(4, os.cpus().length)));

import cluster from 'node:cluster';
import { createApp } from '../src/app/app.mjs';
import { mountFrontend } from '../src/app/frontend.mjs';
import { pruneRateLimitBuckets } from '../src/app/ratelimit.mjs';

const production = process.argv.includes('--production');
const clusterEnabled = process.env.CLUSTER === 'true' || (production && process.env.CLUSTER !== 'false');
const workerCount = Math.max(
  1,
  Math.min(16, Number.parseInt(process.env.WEB_CONCURRENCY || '', 10) || os.cpus().length),
);

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
  const { app, store, runtime } = createApp({
    filename: process.env.DATABASE_PATH || 'data/lamid.db',
    production,
  });
  const frontend = await mountFrontend(app, { production });
  const port = Number(process.env.PORT || 3000);
  const server = app.listen(port, '127.0.0.1', () =>
    console.log(`LAMID ONE is ready at http://localhost:${port}`),
  );

  // Only one process runs the workflow scheduler — otherwise every cluster worker would
  // execute the same scheduled step, duplicating side effects.
  const runsWorkflowTicker = !cluster.isWorker || cluster.worker.id === 1;
  const worker = runsWorkflowTicker
    ? setInterval(() => {
        try {
          runtime.tick();
        } catch (error) {
          console.error('Workflow worker failed:', error);
        }
      }, 1000)
    : null;
  worker?.unref();

  // Safe for every process to run redundantly — a plain indexed DELETE, not a business
  // action — so no cluster-leader guard is needed here (unlike the ticker above).
  const sweep = setInterval(() => {
    try {
      pruneRateLimitBuckets(store);
    } catch (error) {
      console.error('Rate limit bucket sweep failed:', error);
    }
  }, 60_000);
  sweep.unref();

  for (const signal of ['SIGINT', 'SIGTERM'])
    process.on(signal, () => {
      if (worker) clearInterval(worker);
      clearInterval(sweep);
      server.close(async () => {
        await frontend.close();
        store.db.close();
        process.exit(0);
      });
    });
}
