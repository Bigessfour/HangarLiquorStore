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
      return `${node} node_modules/typescript/bin/tsc -b && ${node} node_modules/vite/bin/vite.js build && ${node} node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173`;
    })(),
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],
});