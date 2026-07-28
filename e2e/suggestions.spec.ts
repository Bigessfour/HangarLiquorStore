import { expect, test } from './fixtures';
import { mockForecastApis } from './helpers/mock-api';

test.beforeEach(async ({ page }) => {
  await mockForecastApis(page);
});

test('suggestions page loads', async ({ page }) => {
  await page.goto('/suggestions');
  await expect(page.getByRole('heading', { name: 'Suggestions' })).toBeVisible();
});

test('suggestions show forecast-driven items', async ({ page }) => {
  await page.goto('/suggestions');
  await expect(page.getByText(/Bud Light|Jack Daniel|Tito/i).first()).toBeVisible();
});

test('suggestions include quantity recommendation', async ({ page }) => {
  await page.goto('/suggestions');
  await expect(page.getByText(/units/i).first()).toBeVisible();
});

test('add to stock action available', async ({ page }) => {
  await page.goto('/suggestions');
  await expect(page.getByRole('button', { name: /Add to Stock/i }).first()).toBeVisible();
});

test('holiday stocking section shows for upcoming holidays', async ({ page }) => {
  await page.goto('/suggestions');
  await expect(page.getByTestId('holiday-stocking')).toBeVisible({ timeout: 8000 });
  await expect(
    page.getByText(/Holiday stocking|July 4|Labor Day|Thanksgiving|Christmas|Halloween/i).first(),
  ).toBeVisible();
});
