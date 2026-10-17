import { defineConfig, devices } from '@playwright/test';
import config from '../playwright.config';

export default defineConfig({
  ...config,
  testDir: '.',
  testMatch: 'initial-loader-sidebar.spec.ts',
  timeout: 60_000,
  use: { ...config.use, channel: undefined },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'ios-webkit', use: { ...devices['iPhone 13'] } },
  ],
});
