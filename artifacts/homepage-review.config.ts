import config from '../playwright.config';
import { defineConfig } from '@playwright/test';
export default defineConfig({ ...config, testDir: '../tests/browser', webServer: undefined, use: { ...config.use, channel: 'msedge' } });
