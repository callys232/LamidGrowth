import express from 'express';
import { resolve } from 'node:path';

/** Register frontend delivery after API routes, including their JSON 404 handler. */
export async function mountFrontend(app, { production = false, hmrPort } = {}) {
  if (production) {
    app.use(express.static(resolve('dist'), { index: false }));
    app.get('/{*path}', (_req, res) => res.sendFile(resolve('dist/index.html')));
    return { close: async () => {} };
  }
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true, ...(hmrPort ? { hmr: { port: hmrPort } } : {}) },
    appType: 'spa',
  });
  app.use(vite.middlewares);
  return { close: () => vite.close() };
}
