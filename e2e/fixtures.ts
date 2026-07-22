import { test as base, expect } from '@playwright/test';

const DEMO_AUTH_STORAGE = {
  username: 'demo-owner',
  token: 'demo-token',
  role: 'Owner',
} as const;

const TRIAL_SKIPPED = {
  status: 'skipped',
  stepIndex: 0,
} as const;

/** Inject Owner session so AuthGuard passes without Cognito in preview builds. */
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.addInitScript(
      ({ auth, trial }) => {
        localStorage.setItem('hanger_auth_user', JSON.stringify(auth));
        // Default e2e: do not auto-open guided trial (dedicated tour specs clear this).
        localStorage.setItem('hanger_guided_trial', JSON.stringify(trial));
      },
      { auth: DEMO_AUTH_STORAGE, trial: TRIAL_SKIPPED },
    );
    await use(context);
  },
});

export { expect };
