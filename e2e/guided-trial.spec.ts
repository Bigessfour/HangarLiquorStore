import { expect, test } from './fixtures';

test.describe('owner guided trial', () => {
  test('auto-offers welcome when trial not started', async ({ page, context }) => {
    await context.addInitScript(() => {
      localStorage.setItem(
        'hanger_guided_trial',
        JSON.stringify({ status: 'not_started', stepIndex: 0 }),
      );
    });
    await page.goto('/');
    await expect(page.getByTestId('guided-trial-overlay')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Welcome to Hangar Liquor/i })).toBeVisible();
  });

  test('skip closes overlay and leaves app usable', async ({ page, context }) => {
    await context.addInitScript(() => {
      localStorage.setItem(
        'hanger_guided_trial',
        JSON.stringify({ status: 'not_started', stepIndex: 0 }),
      );
    });
    await page.goto('/');
    await page.getByTestId('guided-trial-skip').click();
    await expect(page.getByTestId('guided-trial-overlay')).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  });

  test('More Start trial run walks to dashboard then scan', async ({ page }) => {
    await page.goto('/more');
    await page.getByTestId('start-trial-run').click();
    await expect(page.getByTestId('guided-trial-overlay')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Welcome to Hangar Liquor/i })).toBeVisible();

    await page.getByTestId('guided-trial-next').click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: /Home — your store/i })).toBeVisible();

    await page.getByTestId('guided-trial-next').click();
    await expect(page).toHaveURL(/\/scan/);
    await expect(page.getByRole('heading', { name: /Scan a bottle/i })).toBeVisible();
    await expect(page.getByTestId('guided-trial-try')).toBeVisible();
  });

  test('in-progress trial resumes overlay after reload', async ({ page, context }) => {
    await context.addInitScript(() => {
      localStorage.setItem(
        'hanger_guided_trial',
        JSON.stringify({ status: 'in_progress', stepIndex: 2 }),
      );
    });
    await page.goto('/');
    await expect(page.getByTestId('guided-trial-overlay')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Scan a bottle/i })).toBeVisible();
  });

  test('completed trial does not auto-offer', async ({ page, context }) => {
    await context.addInitScript(() => {
      localStorage.setItem(
        'hanger_guided_trial',
        JSON.stringify({ status: 'completed', stepIndex: 8 }),
      );
    });
    await page.goto('/');
    await expect(page.getByTestId('guided-trial-overlay')).toHaveCount(0);
  });
});
