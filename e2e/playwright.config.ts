import { defineConfig, devices } from '@playwright/test';

const ci = !!process.env.CI;

// Own ports, so a running `pnpm dev` (:3000, :5173) is never reused or written to.
const apiURL = 'http://localhost:3100';
const appURL = 'http://localhost:5174';

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  reporter: ci ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: appURL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // An in-memory database, so every run starts empty.
      command: 'pnpm --filter backend exec tsx src/index.ts',
      env: { PORT: '3100', DB_PATH: ':memory:' },
      url: `${apiURL}/api/event-types`,
      reuseExistingServer: false,
    },
    {
      command: 'pnpm --filter frontend exec vite --port 5174 --strictPort',
      env: { API_URL: apiURL },
      url: appURL,
      reuseExistingServer: false,
    },
  ],
});
