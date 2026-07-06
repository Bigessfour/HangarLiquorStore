import type { Page } from '@playwright/test';

export const mockForecasts = [
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

export const mockEvents = {
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

export async function mockForecastApis(page: Page, boosted = false) {
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