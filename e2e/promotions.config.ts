import { defineConfig } from '@playwright/test';
import config from '../playwright.config';

// The isolated fixture runner serves the website on 3003 and never contacts the real API.
export default defineConfig({
  ...config,
  testDir: '.',
  testMatch: 'promotions.spec.ts',
  use: { ...config.use, baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3003' },
});
