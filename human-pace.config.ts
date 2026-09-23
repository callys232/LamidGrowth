import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
if (existsSync('.env')) process.loadEnvFile('.env');
const port = Number(process.env.E2E_PORT || 3134);
export default defineConfig({
  testDir: './tests/browser',
  testMatch: 'human-pace.spec.ts',
  workers: 1,
  timeout: 300000,
  expect: { timeout: 30000 },
  reporter: 'list',
  // Deliberately no reducedMotion override — a real visitor sees the app's actual motion design.
  use: { baseURL: `http://127.0.0.1:${port}`, actionTimeout: 30000, trace: 'retain-on-failure' },
  webServer: {
    command: 'node scripts/usability-server-paid.mjs',
    url: `http://127.0.0.1:${port}/api/health`,
    timeout: 120000,
    reuseExistingServer: false,
    env: { E2E_PORT: String(port) },
  },
});
