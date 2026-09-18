import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
if (existsSync('.env')) process.loadEnvFile('.env');
const port = Number(process.env.E2E_PORT || 3133);
export default defineConfig({
  testDir: './tests/browser', testMatch: 'deep-coverage.spec.ts', workers: 1,
  // This environment's DB round-trips run 20-70s+ each, and this spec now does 25+ sequential
  // steps across two browser contexts (full marketplace chain) — a generous ceiling here avoids
  // a false "stuck" read on a test that's still legitimately progressing.
  timeout: 900000, expect: { timeout: 30000 }, reporter: 'list',
  use: { baseURL: `http://127.0.0.1:${port}`, actionTimeout: 30000, trace: 'retain-on-failure' },
  webServer: { command: `node scripts/usability-server-paid.mjs`, url: `http://127.0.0.1:${port}/api/health`, timeout: 120000, reuseExistingServer: false, env: { E2E_PORT: String(port) } },
});
