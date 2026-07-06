import { expect, test } from './fixtures';
import { mockForecastApis } from './helpers/mock-api';

const routes = [
  { path: '/', label: 'home' },
  { path: '/scan', label: 'scan' },
  { path: '/inventory', label: 'inventory' },
  { path: '/events', label: 'events' },
  { path: '/forecast', label: 'forecast' },
  { path: '/suggestions', label: 'suggestions' },
  { path: '/more', label: 'more' },
] as const;

test.beforeEach(async ({ page }) => {
  await mockForecastApis(page);
});

for (const route of routes) {
  test(`route ${route.path} loads without crash`, async ({ page }) => {
    await page.goto(route.path);
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  });
}

test('all bottom nav links present', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(nav.getByRole('link', { name: 'Scan' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Inventory' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Forecast' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Suggestions' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'More' })).toBeVisible();
});

test('scan FAB present on inventory page', async ({ page }) => {
  await page.goto('/inventory');
  await expect(page.getByRole('button', { name: 'Scan Bottle' })).toBeVisible();
});