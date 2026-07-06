import { expect, test } from './fixtures';
import { mockForecastApis } from './helpers/mock-api';

test.beforeEach(async ({ page }) => {
  await mockForecastApis(page);
});

test('more page loads', async ({ page }) => {
  await page.goto('/more');
  await expect(page.getByRole('heading', { name: 'More' })).toBeVisible();
});

test('more page shows PWA install section', async ({ page }) => {
  await page.goto('/more');
  await expect(page.getByText(/Install|PWA|home screen/i).first()).toBeVisible();
});

test('more page shows QR code section', async ({ page }) => {
  await page.goto('/more');
  await expect(page.getByText(/QR|staff/i).first()).toBeVisible();
});

test('more page user management for owner demo', async ({ page }) => {
  await page.goto('/more');
  await expect(page.getByText(/User|Staff|Team/i).first()).toBeVisible();
});

test('more page theme toggle', async ({ page }) => {
  await page.goto('/more');
  await expect(page.getByRole('button', { name: /theme|dark|light/i }).first()).toBeVisible();
});

test('more page links to forecast', async ({ page }) => {
  await page.goto('/more');
  await page.getByRole('link', { name: /Forecast Reports/i }).click();
  await expect(page).toHaveURL(/forecast/);
});

test('owner sees Square POS connection (owner only)', async ({ page }) => {
  await page.route('**/api/square/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        credentialsConfigured: true,
        connected: false,
        merchantName: null,
        merchantId: null,
        locationName: null,
        locationId: null,
        connectedAt: null,
        connectedBy: null,
        scopes: ['ORDERS_READ', 'PAYMENTS_READ'],
      }),
    });
  });
  await page.goto('/more');
  await expect(page.getByText(/Square POS connection/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Connect Square account/i })).toBeVisible();
});