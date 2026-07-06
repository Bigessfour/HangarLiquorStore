import { expect, test } from './fixtures';
import { mockForecastApis, mockForecasts } from './helpers/mock-api';

test('forecast dashboard loads', async ({ page }) => {
  await mockForecastApis(page);
  await page.goto('/forecast');

  await expect(page.getByRole('heading', { name: 'Demand Forecast' })).toBeVisible();
  await expect(page.getByText('Items with active forecasts')).toBeVisible();
  await expect(page.getByText('Bud Light 12pk 12oz Cans')).toBeVisible();
});

test('adding a local event refreshes boosted forecasts', async ({ page }) => {
  await page.route('**/api/forecast**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        mockForecasts.map((item) => ({
          ...item,
          predictedDemand14d: item.predictedDemand14d + 40,
        })),
      ),
    });
  });

  await page.route('**/api/events**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ localEvents: [], staticHolidays: [] }),
      });
      return;
    }
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'evt_new', ...JSON.parse(route.request().postData() ?? '{}') }),
      });
      return;
    }
    await route.continue();
  });
  await page.goto('/forecast');

  const addEventBtn = page.getByRole('button', { name: '+ Add Local Event' });
  await addEventBtn.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'nearest' }));
  await addEventBtn.click({ force: true });
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Event Name').fill('Wiley Harvest Festival');
  await dialog.getByLabel('Start Date').fill('2026-07-10');
  await dialog.getByLabel('End Date').fill('2026-07-12');
  await dialog.getByLabel('Demand Multiplier').fill('2.5');
  await dialog.getByRole('button', { name: 'Save Event & Update Forecasts' }).click({ force: true });

  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('item detail tab opens from overview row', async ({ page }) => {
  await mockForecastApis(page);
  await page.goto('/forecast');

  await page.getByText('Bud Light 12pk 12oz Cans').click();
  await expect(page.getByText('Predicted Demand (14d)')).toBeVisible();
  await expect(page.getByText('high confidence')).toBeVisible();
});

test('deep-link selects item detail from upc query', async ({ page }) => {
  await mockForecastApis(page);
  await page.goto('/forecast?upc=082184000012');

  await expect(page).toHaveURL(/upc=082184000012/);
  await expect(page.getByRole('heading', { name: /Demand Forecast/i })).toBeVisible();
  await expect(page.getByText("Jack Daniel's Tennessee Whiskey 750ml")).toBeVisible();
});

test('shows error state when forecast api fails', async ({ page }) => {
  await page.route('**/api/forecast**', async (route) => {
    await route.fulfill({ status: 500, body: JSON.stringify({ error: 'Server error' }) });
  });
  await mockForecastApis(page);
  await page.goto('/forecast');
  await expect(page.getByRole('heading', { name: /Demand Forecast/i })).toBeVisible();
});