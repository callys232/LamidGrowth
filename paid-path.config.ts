import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
// Safe dotenv parse (not shell sourcing) so this config's own process — and, by inheritance, the
// webServer child process it spawns — has TEST_DATABASE_URL for the test-only points top-up.
if (existsSync('.env')) process.loadEnvFile('.env');
const port = Number(process.env.E2E_PORT || 3131);
export default defineConfig({
  testDir: './tests/browser',
  testMatch: 'paid-path-demo.spec.ts',
  workers: 1,
  timeout: 180000,
  expect: { timeout: 25000 },
  reporter: 'list',
  use: { baseURL: `http://127.0.0.1:${port}`, actionTimeout: 30000, trace: 'retain-on-failure' },
  webServer: {
    command: 'node scripts/usability-server-paid.mjs',
    url: `http://127.0.0.1:${port}/api/health`,
    timeout: 120000,
    reuseExistingServer: false,
  },
});
