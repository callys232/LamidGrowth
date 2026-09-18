import { defineConfig } from '@playwright/test';
const port = Number(process.env.E2E_PORT || 3135);
export default defineConfig({
  testDir: './tests/browser', testMatch: 'click-everything.spec.ts', workers: 1,
  timeout: 600000, expect: { timeout: 20000 }, reporter: 'list',
  use: { baseURL: `http://127.0.0.1:${port}`, actionTimeout: 15000, trace: 'retain-on-failure' },
  webServer: { command: 'node scripts/e2e-server.mjs', url: `http://127.0.0.1:${port}/api/health`, timeout: 60000, reuseExistingServer: false, env: { E2E_PORT: String(port) } },
});
