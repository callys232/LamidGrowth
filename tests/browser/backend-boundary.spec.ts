import { test, expect } from '@playwright/test';

test('backend routes work while server-only source stays outside frontend delivery', async ({
  request,
}) => {
  const health = await request.get('/api/health');
  expect(health.status()).toBe(200);
  expect(await health.json()).toEqual({ status: 'ok' });
  for (const file of ['/src/app/app.mjs', '/src/app/ai.mjs?raw', '/server/store.mjs']) {
    const response = await request.get(file);
    expect(response.status(), file).toBe(403);
  }
});
