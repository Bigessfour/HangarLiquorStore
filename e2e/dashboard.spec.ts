import { expect, test } from './fixtures';
import { mockForecastApis } from './helpers/mock-api';

test.beforeEach(async ({ page }) => {
  await mockForecastApis(page);
});

test('dashboard loads with heading', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Hanger Liquor Store • Wiley, CO • Today' }),
  ).toBeVisible();
});

test('owner dashboard shows Square connect card with instructions link', async ({ page }) => {
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
        scopes: ['ORDERS_READ'],
      }),
    });
  });
  await page.goto('/');
  await expect(page.getByText(/Connect Square POS/i)).toBeVisible();
  await page.getByRole('link', { name: /Setup instructions/i }).click();
  await expect(page).toHaveURL(/square-setup/);
  await expect(page.getByRole('heading', { name: /Connect Square POS/i })).toBeVisible();
});

test('dashboard shows low stock alerts', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/Jack Daniel.*left/i)).toBeVisible();
});

test('dashboard shows total stock summary', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Total Stock')).toBeVisible();
});

test('dashboard chart section renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/Top Movers/i)).toBeVisible();
});

test('dashboard links to inventory', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Inventory' }).click();
  await expect(page).toHaveURL(/inventory/);
});

test('dashboard links to forecast', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /View full report/i }).click();
  await expect(page).toHaveURL(/forecast/);
});

test('scan FAB is visible on dashboard', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Scan Bottle' })).toBeVisible();
});

test('scan FAB opens modal with photo capture and manual fallback', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Scan Bottle' }).click();

  await expect(page.getByRole('dialog', { name: 'Scan bottle barcode' })).toBeVisible();
  await expect(page.getByRole('button', { name: /start live camera/i })).toBeVisible();
  await expect(page.getByText(/take photo instead/i)).toBeVisible();

  await page.getByRole('button', { name: /enter UPC manually/i }).click();
  await expect(page).toHaveURL(/\/scan$/);
});

test('bottom nav visible on dashboard', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
});