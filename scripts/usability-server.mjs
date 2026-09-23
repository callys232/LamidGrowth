import { createApp } from '../src/app/app.mjs';
import { mountFrontend } from '../src/app/frontend.mjs';

const { app, store } = await createApp({
  filename: ':memory:',
  aiProvider: null,
  mailProvider: null,
  paymentProvider: () => null,
  welcomeIpVelocityLimit: 10000,
  rateLimits: {
    api: { max: 10000 },
    auth: { max: 10000 },
    mutation: { max: 10000 },
    spend: { max: 10000 },
  },
});
const port = Number(process.env.E2E_PORT || 3129);
const frontend = await mountFrontend(app, { hmrPort: port + 1 });
const server = app.listen(port, '127.0.0.1');
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () =>
    server.close(async () => {
      await frontend.close();
      await store.dropSchema();
      process.exit(0);
    }),
  );
