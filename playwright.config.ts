import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: (() => {
      const node = `"${process.execPath}"`;
      // Force mock API + demo auth — ignore synced .env production VITE_API_URL
      const e2eEnv =
        'VITE_DEMO_AUTH=true VITE_API_URL= VITE_COGNITO_USER_POOL_ID= VITE_COGNITO_CLIENT_ID=';
      return `${e2eEnv} ${node} node_modules/typescript/bin/tsc -b && ${e2eEnv} ${node} node_modules/vite/bin/vite.js build && ${e2eEnv} ${node} node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173`;
    })(),
    port: 4173,
    reuseExistingServer: false,
  },
  projects: [
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],
});