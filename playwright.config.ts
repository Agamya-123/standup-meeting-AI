import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, 'server/.env') });

export default defineConfig({
  testDir: './e2e',
  timeout: 60 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
  fullyParallel: false,
  workers: 1, // Single worker ensures deterministic database state against isolated e2e.db
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : [
    {
      command: 'npm run dev',
      cwd: path.resolve(__dirname, 'server'),
      url: 'http://localhost:5000/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      env: {
        DATABASE_URL: 'file:./e2e.db',
        NODE_ENV: 'e2e',
        // E2E reseeds the database before every test; login traffic must not
        // accumulate against a shared local server IP during the suite.
        E2E_DISABLE_RATE_LIMIT: 'true',
      }
    },
    {
      command: 'npm run dev',
      cwd: path.resolve(__dirname, 'client'),
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  ],
});
