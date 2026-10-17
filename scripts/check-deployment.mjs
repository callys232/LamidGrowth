import { existsSync } from 'node:fs';
import { validateProductionConfig } from '../src/app/operations.mjs';

if (existsSync('.env')) process.loadEnvFile('.env');
let stage = 'configuration';
try {
  if (process.argv.includes('--config')) {
    validateProductionConfig();
    console.log('Production configuration checks passed. No secrets were printed.');
  } else if (process.argv.includes('--live')) {
    const api = new URL(process.env.DEPLOY_API_ORIGIN || process.env.PUBLIC_ORIGIN);
    const frontend = new URL(
      process.env.DEPLOY_FRONTEND_ORIGIN ||
        process.env.DEMO_PUBLIC_ORIGIN ||
        process.env.FRONTEND_ORIGINS?.split(',')[0] ||
        process.env.PUBLIC_ORIGIN,
    );
    for (const url of [api, frontend]) {
      if (
        url.protocol !== 'https:' ||
        url.username ||
        url.password ||
        url.pathname !== '/' ||
        url.search ||
        url.hash
      )
        throw new Error('Deployment smoke checks require API and frontend HTTPS origins.');
    }
    async function request(url, options = {}) {
      stage = url.pathname.startsWith('/assets/') ? 'frontend JavaScript asset' : url.pathname;
      const response = await fetch(url, {
        ...options,
        redirect: 'error',
        signal: AbortSignal.timeout(15000),
      });
      return response;
    }
    for (const path of ['/api/health', '/api/ready']) {
      const response = await request(new URL(path, api), { headers: { Origin: frontend.origin } });
      if (
        !response.ok ||
        !(response.headers.get('content-type') || '').includes('application/json')
      )
        throw new Error(`${path} did not return healthy JSON.`);
      const health = await response.json();
      if (health.status !== (path === '/api/ready' ? 'ready' : 'ok'))
        throw new Error(`${path} reported an unhealthy status.`);
      if (
        response.headers.get('access-control-allow-origin') !== frontend.origin ||
        response.headers.get('access-control-allow-credentials') !== 'true'
      )
        throw new Error('API CORS does not allow the configured frontend with credentials.');
      console.log(`PASS ${path} and frontend CORS`);
    }
    const preflight = await request(new URL('/api/demo/session', api), {
      method: 'OPTIONS',
      headers: {
        Origin: frontend.origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    });
    if (
      preflight.status !== 204 ||
      preflight.headers.get('access-control-allow-origin') !== frontend.origin ||
      !preflight.headers.get('access-control-allow-methods')?.includes('POST')
    )
      throw new Error('Demo API preflight failed.');
    const denied = await request(new URL('/api/demo/session', api), {
      method: 'POST',
      headers: { Origin: frontend.origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: '0'.repeat(64) }),
    });
    if (denied.status !== 401 || !(denied.headers.get('cache-control') || '').includes('no-store'))
      throw new Error('Demo session rejection/cache protection failed.');
    console.log('PASS demo preflight, invalid-session rejection and cache protection');
    for (const path of ['/demo', '/demo/workspace', '/os/learning', '/signup']) {
      const response = await request(new URL(path, frontend));
      const html = await response.text();
      if (
        !response.ok ||
        !(response.headers.get('content-type') || '').includes('text/html') ||
        !html.includes('id="root"')
      )
        throw new Error(`Frontend SPA routing failed for ${path}.`);
      const asset = html.match(/src="([^"\s]*\/assets\/[^"\s]+\.js)"/);
      if (!asset) throw new Error(`Frontend entry asset missing for ${path}.`);
      const script = await request(new URL(asset[1], frontend));
      if (!script.ok || !(script.headers.get('content-type') || '').match(/javascript/))
        throw new Error('Frontend entry JavaScript is unavailable.');
      console.log(`PASS frontend ${path} and entry asset`);
    }
    console.log(
      'Smoke checks passed. No registration, email, purchase or account was created. Verify real inbox delivery separately.',
    );
  } else throw new Error('Choose --config or --live.');
} catch (error) {
  // Avoid raw network errors/URLs, which can include credentials or query strings.
  console.error(
    error.name === 'TypeError'
      ? `Deployment check failed at ${stage}: ${/^[A-Z_0-9]+$/.test(error.cause?.code || '') ? error.cause.code : 'invalid origin or connection failure'}.`
      : error.message,
  );
  process.exitCode = 1;
}
