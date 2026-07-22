import { expect, test } from './fixtures';
import { mockForecastApis } from './helpers/mock-api';

test.beforeEach(async ({ page }) => {
  await mockForecastApis(page);
});

test('profit page shows pulse and money in pocket', async ({ page }) => {
  await page.goto('/profit');
  await expect(page.getByRole('heading', { name: 'Profit & Ops' })).toBeVisible();
  await expect(page.getByText(/Money in your pocket/i)).toBeVisible();
  await expect(page.getByRole('group', { name: /Period/i })).toBeVisible();
  await page.getByRole('group', { name: /Period/i }).getByRole('button', { name: 'Day', exact: true }).click();
  await expect(page.getByText(/Today/i).first()).toBeVisible();
});

test('ask hangar answers suggested prompt', async ({ page }) => {
  await page.goto('/profit');
  await page.getByRole('button', { name: /Hay Days/i }).click();
  await expect(page.getByText(/Hay Days|ice|beer/i).first()).toBeVisible({ timeout: 5000 });
});
