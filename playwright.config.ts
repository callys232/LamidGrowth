import { defineConfig } from '@playwright/test';
const port = Number(process.env.E2E_PORT || 3107);
export default defineConfig({
  testDir: './tests/browser',
  // These exploratory studies use their own isolated server and provider configuration.
  testIgnore: ['regional-usability.spec.ts', 'paid-path-demo.spec.ts', 'deep-coverage.spec.ts'],
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    channel: process.env.BROWSER_CHANNEL,
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node scripts/e2e-server.mjs',
    url: `http://127.0.0.1:${port}/api/health`,
    reuseExistingServer: false,
    timeout: 60000,
  },
});
