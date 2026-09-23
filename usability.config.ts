import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  testMatch: 'regional-usability.spec.ts',
  workers: 2,
  timeout: 180000,
  expect: { timeout: 25000 },
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:3129', actionTimeout: 30000, trace: 'retain-on-failure' },
  webServer: {
    command: 'node scripts/usability-server.mjs',
    url: 'http://127.0.0.1:3129/api/health',
    timeout: 120000,
    reuseExistingServer: false,
  },
});
