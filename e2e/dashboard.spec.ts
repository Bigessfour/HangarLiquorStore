import { expect, test } from './fixtures';
import { mockForecastApis } from './helpers/mock-api';

test.beforeEach(async ({ page }) => {
  await mockForecastApis(page);
});

test('dashboard loads with heading', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /Hangar Liquor Store.*Wiley, CO.*Today/i }),
  ).toBeVisible();
});

test('owner dashboard shows core stock summary', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Total Stock')).toBeVisible();
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

test('manager can open add local event from dashboard', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('dashboard-add-local-event').click();
  await expect(page.getByRole('heading', { name: /Add Local Event Multiplier/i })).toBeVisible();
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
