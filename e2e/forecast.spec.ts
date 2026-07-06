import { expect, test } from '@playwright/test';

const mockForecasts = [
  {
    upc: '018200000034',
    name: 'Bud Light 12pk 12oz Cans',
    category: 'beer',
    currentStock: 48,
    predictedDemand14d: 80,
    suggestedOrder: 32,
    confidence: 'high',
    source: 'statistical',
    chartData: [
      { date: '2026-06-20', actual: 6, predicted: 7, lower: 6, upper: 8 },
      { date: '2026-07-10', predicted: 9, lower: 7, upper: 11 },
    ],
  },
  {
    upc: '008216000032',
    name: "Jack Daniel's Old No.7 750ml",
    category: 'spirits',
    currentStock: 22,
    predictedDemand14d: 31,
    suggestedOrder: 24,
    confidence: 'medium',
    source: 'statistical',
    chartData: [],
  },
];

const mockEvents = {
  localEvents: [
    {
      id: 'e1',
      name: 'July 4th Weekend',
      startDate: '2026-07-03',
      endDate: '2026-07-05',
      multiplier: 2.8,
    },
  ],
  staticHolidays: [
    {
      id: 'july-4th',
      name: 'July 4th Weekend',
      startDate: '2026-07-03',
      endDate: '2026-07-05',
      multiplier: 2.8,
    },
  ],
};

async function mockForecastApis(page: import('@playwright/test').Page, boosted = false) {
  await page.route('**/api/forecast**', async (route) => {
    const payload = boosted
      ? mockForecasts.map((item) => ({
          ...item,
          predictedDemand14d: item.predictedDemand14d + 40,
          suggestedOrder: item.suggestedOrder + 20,
        }))
      : mockForecasts;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    });
  });

  await page.route('**/api/events**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockEvents),
      });
      return;
    }

    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'evt_new',
          ...JSON.parse(route.request().postData() ?? '{}'),
        }),
      });
      return;
    }

    await route.continue();
  });
}

test('forecast dashboard loads', async ({ page }) => {
  await mockForecastApis(page);
  await page.goto('/forecast');

  await expect(page.getByRole('heading', { name: 'Demand Forecast' })).toBeVisible();
  await expect(page.getByText('Items with active forecasts')).toBeVisible();
  await expect(page.getByText('Bud Light 12pk 12oz Cans')).toBeVisible();
});

test('adding a local event refreshes boosted forecasts', async ({ page }) => {
  let forecastCalls = 0;

  await page.route('**/api/forecast**', async (route) => {
    forecastCalls += 1;
    const boosted = forecastCalls > 1;
    const payload = boosted
      ? mockForecasts.map((item) => ({
          ...item,
          predictedDemand14d: item.predictedDemand14d + 40,
        }))
      : mockForecasts;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    });
  });

  await page.route('**/api/events**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockEvents),
      });
      return;
    }

    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'evt_new',
          ...JSON.parse(route.request().postData() ?? '{}'),
        }),
      });
      return;
    }

    await route.continue();
  });

  await page.goto('/forecast');

  const firstRow = page.locator('table tbody tr').first();
  const initialPredicted = await firstRow.locator('td').nth(2).textContent();

  await page.getByRole('button', { name: '+ Add Local Event' }).click();
  await page.getByLabel('Event Name').fill('Wiley Harvest Festival');
  await page.getByLabel('Start Date').fill('2026-07-10');
  await page.getByLabel('End Date').fill('2026-07-12');
  await page.getByLabel('Demand Multiplier').fill('2.5');
  await page.getByRole('button', { name: 'Save Event & Update Forecasts' }).click();

  await expect
    .poll(async () => firstRow.locator('td').nth(2).textContent())
    .not.toBe(initialPredicted);
  expect(Number(await firstRow.locator('td').nth(2).textContent())).toBeGreaterThan(
    Number(initialPredicted),
  );
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
  await page.goto('/forecast?upc=008216000032');

  await expect(page.getByRole('heading', { name: "Jack Daniel's Old No.7 750ml" })).toBeVisible();
});

test('shows error state when forecast api fails', async ({ page }) => {
  await page.route('**/api/forecast**', async (route) => {
    await route.fulfill({ status: 500, body: JSON.stringify({ error: 'Server error' }) });
  });

  await page.route('**/api/events**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockEvents),
    });
  });

  await page.goto('/forecast');
  await expect(page.getByText('Failed to load forecasts')).toBeVisible();
});
