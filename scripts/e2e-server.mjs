import { createApp } from '../src/app/app.mjs';
import { mountFrontend } from '../src/app/frontend.mjs';

// Browser tests never reuse the development server or open its account database.
const { app, store, runtime } = createApp({
  filename: ':memory:',
  aiProvider: null,
  rateLimits: { api: { max: 10000 }, auth: { max: 10000 }, mutation: { max: 10000 } },
});
const frontend = await mountFrontend(app, { hmrPort: 24679 });
const server = app.listen(3107, '127.0.0.1');
const worker = setInterval(() => runtime.tick(), 250);
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, () => {
    clearInterval(worker);
    server.close(async () => {
      await frontend.close();
      store.db.close();
      process.exit(0);
    });
  });
