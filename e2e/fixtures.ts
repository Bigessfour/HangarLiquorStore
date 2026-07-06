import { test as base, expect } from '@playwright/test';

const DEMO_AUTH_STORAGE = {
  username: 'demo-owner',
  token: 'demo-token',
  role: 'Owner',
} as const;

/** Inject Owner session so AuthGuard passes without Cognito in preview builds. */
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.addInitScript((auth) => {
      localStorage.setItem('hanger_auth_user', JSON.stringify(auth));
    }, DEMO_AUTH_STORAGE);
    await use(context);
  },
});

export { expect };