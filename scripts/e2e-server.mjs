import { createApp } from '../src/app/app.mjs';
import { mountFrontend } from '../src/app/frontend.mjs';

// Browser tests never reuse the development server or open its account database.
const { app, store, runtime } = await createApp({
  filename: ':memory:',
  aiProvider: null,
  rateLimits: { api: { max: 10000 }, auth: { max: 10000 }, mutation: { max: 10000 } },
  // Every browser test hits the server from the same local IP, so the real per-IP
  // welcome-bonus velocity limit (3/24h) would otherwise make later signups in the
  // same run flakily land in "review" with no reward, even though each is a distinct
  // real signup+OTP+verify flow that should be treated as legitimate for testing.
  welcomeIpVelocityLimit: 10000,
});
const port = Number(process.env.E2E_PORT || 3107);
const frontend = await mountFrontend(app, { hmrPort: process.env.E2E_PORT ? port + 1 : 24679 });
const server = app.listen(port, '127.0.0.1');
let ticking = null;
const worker = setInterval(() => {
  if (!ticking)
    ticking = runtime
      .tick()
      .catch((error) => console.error('Test workflow tick failed:', error.message))
      .finally(() => {
        ticking = null;
      });
}, 250);
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, () => {
    clearInterval(worker);
    server.close(async () => {
      await frontend.close();
      if (ticking) await ticking;
      await store.db.close();
      process.exit(0);
    });
  });
