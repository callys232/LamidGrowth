import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  testMatch: 'document-updates.spec.ts',
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:3119', headless: true },
  webServer: {
    command: 'npx vite preview --host 127.0.0.1 --port 3119 --strictPort',
    url: 'http://127.0.0.1:3119',
    reuseExistingServer: false,
  },
});
