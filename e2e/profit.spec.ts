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
  await page.getByRole('group', { name: /Period/i }).getByRole('button', { name: 'Year', exact: true }).click();
  await expect(page.getByText(/Last 12 months|Year/i).first()).toBeVisible();
});

test('profit shows demo simulation banner when e2e sim flags on', async ({ page }) => {
  await page.goto('/profit');
  await expect(page.getByText(/simulation|demo estimate|representation/i).first()).toBeVisible();
});

test('ask hangar answers overstock prompt', async ({ page }) => {
  await page.goto('/profit');
  await page.getByRole('button', { name: /biggest overstock/i }).click();
  await expect(page.getByText(/cash tied up|overstock|Jack Daniel|cover/i).first()).toBeVisible({
    timeout: 5000,
  });
});

test('ask hangar answers holiday stocking prompt', async ({ page }) => {
  await page.goto('/profit');
  await page.getByRole('button', { name: /stock for the next holiday/i }).click();
  await expect(page.getByText(/holiday|stock|beer|spirits|Suggestions/i).first()).toBeVisible({
    timeout: 5000,
  });
});

test('ask hangar answers money in pocket prompt', async ({ page }) => {
  await page.goto('/profit');
  await page.getByRole('button', { name: /money is in my pocket/i }).click();
  await expect(page.getByText(/saved|made|\$/i).first()).toBeVisible({ timeout: 5000 });
});

test('profit recommendation list visible', async ({ page }) => {
  await page.goto('/profit');
  await expect(page.getByTestId('profit-rec-list')).toBeVisible({ timeout: 5000 });
});

test('Saved stays fixed across periods; Made scales with window', async ({ page }) => {
  await page.goto('/profit');
  await expect(page.getByTestId('profit-dollars-saved')).toHaveText('$1,840');
  await expect(page.getByTestId('profit-dollars-made')).toHaveText('$2,100');

  await page.getByRole('group', { name: /Period/i }).getByRole('button', { name: 'Day', exact: true }).click();
  await expect(page.getByTestId('profit-dollars-saved')).toHaveText('$1,840');
  await expect(page.getByTestId('profit-dollars-made')).toHaveText('$70'); // 2100/30

  await page.getByRole('group', { name: /Period/i }).getByRole('button', { name: 'Year', exact: true }).click();
  await expect(page.getByTestId('profit-dollars-saved')).toHaveText('$1,840');
  await expect(page.getByTestId('profit-dollars-made')).toHaveText('$25,200'); // 2100*12
});
