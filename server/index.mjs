import { createApp } from '../src/app/app.mjs';
import { mountFrontend } from '../src/app/frontend.mjs';
const production = process.argv.includes('--production');
const { app, store, runtime } = createApp({
  filename: process.env.DATABASE_PATH || 'data/lamid.db',
  production,
});
const frontend = await mountFrontend(app, { production });
const port = Number(process.env.PORT || 3000);
const server = app.listen(port, '127.0.0.1', () =>
  console.log(`LAMID ONE is ready at http://localhost:${port}`),
);
const worker = setInterval(() => {
  try {
    runtime.tick();
  } catch (error) {
    console.error('Workflow worker failed:', error);
  }
}, 1000);
worker.unref();
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    clearInterval(worker);
    server.close(async () => {
      await frontend.close();
      store.db.close();
      process.exit(0);
    });
  });
