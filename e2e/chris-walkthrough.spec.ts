import { expect, test } from './fixtures';
import { mockForecastApis } from './helpers/mock-api';

/**
 * Chris confidence walkthrough — full guided trial + per-stop smoke.
 * Fail on page errors and failed /api/* responses.
 */
test.describe('Chris guided trial walkthrough', () => {
  test.beforeEach(async ({ page }) => {
    await mockForecastApis(page);

    const failedApis: string[] = [];
    const pageErrors: string[] = [];
    page.on('response', (res) => {
      const url = res.url();
      if (url.includes('/api/') && res.status() >= 400) {
        failedApis.push(`${res.status()} ${url}`);
      }
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });
    (page as unknown as { __failedApis?: string[]; __pageErrors?: string[] }).__failedApis =
      failedApis;
    (page as unknown as { __pageErrors?: string[] }).__pageErrors = pageErrors;
  });

  test.afterEach(async ({ page }) => {
    const bag = page as unknown as { __failedApis?: string[]; __pageErrors?: string[] };
    const failed = bag.__failedApis ?? [];
    const pageErrors = bag.__pageErrors ?? [];
    expect(failed, `Failed API calls during walkthrough:\n${failed.join('\n')}`).toEqual([]);
    expect(pageErrors, `Uncaught page errors:\n${pageErrors.join('\n')}`).toEqual([]);
  });

  test('full tour Next through all stops including Profit', async ({ page }) => {
    await page.goto('/more');
    await page.getByTestId('start-trial-run').click();
    await expect(page.getByTestId('guided-trial-overlay')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Welcome to Hangar Liquor/i })).toBeVisible();

    const stops: { heading: RegExp; url?: RegExp }[] = [
      { heading: /Home — your store/i, url: /\/$/ },
      { heading: /Scan a bottle/i, url: /\/scan/ },
      { heading: /Find & fix inventory/i, url: /\/inventory/ },
      { heading: /Local events \(Hay Days/i, url: /\/events/ },
      { heading: /Forecast — what you will need/i, url: /\/forecast/ },
      { heading: /Suggestions & holiday stocking/i, url: /\/suggestions/ },
      { heading: /Profit & Ask Hangar/i, url: /\/profit/ },
      { heading: /More — install/i, url: /\/more/ },
    ];

    for (const stop of stops) {
      await page.getByTestId('guided-trial-next').click();
      await expect(
        page.getByTestId('guided-trial-overlay').getByRole('heading', { name: stop.heading }),
      ).toBeVisible({
        timeout: 8000,
      });
      if (stop.url) {
        await expect(page).toHaveURL(stop.url);
      }
    }

    await page.getByTestId('guided-trial-next').click(); // Finish
    await expect(page.getByTestId('guided-trial-overlay')).toHaveCount(0);
  });

  test('Try it drives working controls on interactive stops', async ({ page }) => {
    await page.goto('/more');
    await page.getByTestId('start-trial-run').click();

    // Welcome → Dashboard → Scan
    await page.getByTestId('guided-trial-next').click();
    await page.getByTestId('guided-trial-next').click();
    await expect(page.getByRole('heading', { name: /Scan a bottle/i })).toBeVisible();
    await page.getByTestId('guided-trial-try').click();
    await expect(page.getByTestId('guided-trial-try-feedback')).toContainText(/worked/i);
    await expect(page.locator('#scan-upc')).toHaveValue('071984000012', { timeout: 8000 });

    // → Inventory → Events
    await page.getByTestId('guided-trial-next').click();
    await page.getByTestId('guided-trial-next').click();
    await expect(
      page.getByTestId('guided-trial-overlay').getByRole('heading', { name: /Local events/i }),
    ).toBeVisible();
    await page.getByTestId('guided-trial-try').click();
    await expect(page.getByRole('heading', { name: /Add Local Event Multiplier/i })).toBeVisible({
      timeout: 5000,
    });
    // Close dialog so Next can proceed cleanly
    await page.keyboard.press('Escape');

    // → Forecast → Suggestions
    await page.getByTestId('guided-trial-next').click();
    await page.getByTestId('guided-trial-next').click();
    await expect(
      page.getByTestId('guided-trial-overlay').getByRole('heading', { name: /Suggestions/i }),
    ).toBeVisible();
    await expect(page.getByTestId('holiday-stocking')).toBeVisible({ timeout: 8000 });
    await page.getByTestId('guided-trial-try').click();
    await expect(page.getByTestId('guided-trial-try-feedback')).toContainText(/worked/i);

    // → Profit
    await page.getByTestId('guided-trial-next').click();
    await expect(
      page.getByTestId('guided-trial-overlay').getByRole('heading', { name: /Profit & Ask Hangar/i }),
    ).toBeVisible();
    await expect(page.getByTestId('ask-hangar-holiday')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('guided-trial-try').click();
    await expect(page.getByTestId('guided-trial-try-feedback')).toContainText(/worked/i);
    await expect(page.getByTestId('ask-hangar-reply')).toBeVisible({ timeout: 8000 });

    // → More
    await page.getByTestId('guided-trial-next').click();
    await expect(
      page.getByTestId('guided-trial-overlay').getByRole('heading', { name: /More — install/i }),
    ).toBeVisible();
    await page.getByTestId('guided-trial-try').click();
    await expect(page.getByTestId('guided-trial-try-feedback')).toContainText(/worked/i);
    await expect(page.getByTestId('install-app-panel')).toBeVisible();
  });

  test('smoke clicks succeed without tour overlay', async ({ page }) => {
    // Scan manual UPC
    await page.goto('/scan');
    await page.getByLabel('Enter UPC manually').fill('071984000012');
    await page.getByRole('button', { name: 'Apply manual UPC' }).click();
    await expect(page.getByRole('button', { name: 'Add to inventory' })).toBeVisible();

    // Events Hay Days
    await page.goto('/events');
    await page.getByTestId('add-hay-days-example').click();
    await expect(page.getByRole('heading', { name: /Add Local Event Multiplier/i })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByTestId('add-hunting-example').click();
    await expect(page.locator('#name')).toHaveValue('Hunting Season Opener');
    await page.keyboard.press('Escape');

    // Suggestions holiday + Add to Stock
    await page.goto('/suggestions');
    await expect(page.getByTestId('holiday-stocking')).toBeVisible({ timeout: 8000 });
    await page.getByTestId('guided-try-add-stock').click();
    await expect(page.getByText(/Added|stock|queued/i).first()).toBeVisible({ timeout: 5000 });

    // Profit period + Ask Hangar
    await page.goto('/profit');
    await page.getByRole('group', { name: /Period/i }).getByRole('button', { name: 'Day', exact: true }).click();
    await page.getByTestId('ask-hangar-holiday').click();
    await expect(page.getByTestId('ask-hangar-reply')).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId('ask-hangar-reply')).toContainText(/holiday|stock|Suggestions/i);

    // More install + prep checklist
    await page.goto('/more');
    await expect(page.getByTestId('install-app-panel')).toBeVisible();
    await expect(page.getByTestId('chris-prep-checklist')).toBeVisible();
    await expect(page.getByTestId('start-trial-run')).toBeVisible();
  });
});
