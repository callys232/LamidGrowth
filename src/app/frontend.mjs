import express from 'express';
import { existsSync } from 'node:fs';
import { resolve, extname, relative, isAbsolute } from 'node:path';

/** Register frontend delivery after API routes, including their JSON 404 handler. */
export async function mountFrontend(app, { production = false, hmrPort } = {}) {
  if (production) {
    const dist = resolve('dist');
    const cachePolicy = (file) => {
      if (file.endsWith('.html')) return 'no-cache';
      if (/[-.][A-Za-z0-9_-]{8,}\.(?:js|css|woff2?|svg)$/.test(file))
        return 'public, max-age=31536000, immutable';
      return 'public, max-age=86400';
    };
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      const original = resolve(dist, `.${decodeURIComponent(req.path)}`);
      const originalRelative = relative(dist, original);
      if (isAbsolute(originalRelative) || originalRelative.startsWith('..')) return next();
      const accepts = req.get('accept-encoding') || '';
      const sidecar = accepts.includes('br') && existsSync(`${original}.br`)
        ? { file: `${original}.br`, encoding: 'br' }
        : accepts.includes('gzip') && existsSync(`${original}.gz`)
          ? { file: `${original}.gz`, encoding: 'gzip' }
          : null;
      if (!sidecar) return next();
      res.type(extname(original));
      res.set('Content-Encoding', sidecar.encoding);
      res.set('Vary', 'Accept-Encoding');
      res.set('Cache-Control', cachePolicy(original));
      res.sendFile(sidecar.file, { headers: { 'Content-Type': res.get('Content-Type') } });
    });
    app.use(express.static(dist, {
      index: false,
      setHeaders(res, file) {
        res.setHeader('Cache-Control', cachePolicy(file));
      },
    }));
    app.get('/{*path}', (req, res) => {
      const candidate = resolve(dist, `.${decodeURIComponent(req.path)}`, 'index.html');
      const candidateRelative = relative(dist, candidate);
      const file = !isAbsolute(candidateRelative) && !candidateRelative.startsWith('..') && existsSync(candidate)
        ? candidate
        : resolve(dist, 'index.html');
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(file);
    });
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
