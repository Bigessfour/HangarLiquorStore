import { describe, expect, it } from 'vitest';
import { buildItemForecast } from '../lambdas/forecast/lib/forecast-engine';
import type { InventoryRecord, LocalEvent, SalesRecord } from '../shared/types/forecast';

function makeHistory(upc: string, start: string, days: number, qty: number): SalesRecord[] {
  const records: SalesRecord[] = [];
  const startDate = new Date(`${start}T12:00:00.000Z`);

  for (let i = 0; i < days; i += 1) {
    const date = new Date(startDate);
    date.setUTCDate(startDate.getUTCDate() + i);
    records.push({
      upc,
      date: date.toISOString().slice(0, 10),
      quantity: qty + (i % 3),
    });
  }

  return records;
}

const inventory: InventoryRecord = {
  upc: '018200000034',
  name: 'Bud Light 12pk 12oz Cans',
  category: 'beer',
  currentStock: 48,
};

describe('buildItemForecast', () => {
  it('returns higher demand when a local event multiplier is active', () => {
    const today = new Date('2026-05-01T12:00:00.000Z');
    const history = makeHistory(inventory.upc, '2026-02-01', 90, 8);

    const baseline = buildItemForecast({
      inventory,
      salesHistory: history,
      localEvents: [],
      today,
    });

    const boosted: LocalEvent = {
      id: 'e1',
      name: 'Wiley Spring Festival',
      startDate: '2026-05-10',
      endDate: '2026-05-12',
      multiplier: 2.5,
    };

    const withEvent = buildItemForecast({
      inventory,
      salesHistory: history,
      localEvents: [boosted],
      today,
    });

    expect(withEvent.predictedDemand14d).toBeGreaterThan(baseline.predictedDemand14d);
    expect(withEvent.suggestedOrder).toBeGreaterThanOrEqual(baseline.suggestedOrder);
  });

  it.each([
    [7, 'low'],
    [14, 'medium'],
    [30, 'high'],
    [90, 'high'],
  ] as const)('%s days history => %s confidence', (days, confidence) => {
    const today = new Date('2026-07-03T12:00:00.000Z');
    const start = new Date(today);
    start.setUTCDate(start.getUTCDate() - days);
    const startStr = start.toISOString().slice(0, 10);
    const result = buildItemForecast({
      inventory,
      salesHistory: makeHistory(inventory.upc, startStr, days, 5),
      localEvents: [],
      today,
    });
    expect(result.confidence).toBe(confidence);
  });

  it('suggested order is zero when stock exceeds demand', () => {
    const highStock: InventoryRecord = { ...inventory, currentStock: 500 };
    const result = buildItemForecast({
      inventory: highStock,
      salesHistory: makeHistory(inventory.upc, '2026-04-01', 30, 2),
      localEvents: [],
      today: new Date('2026-07-03T12:00:00.000Z'),
    });
    expect(result.suggestedOrder).toBe(0);
  });

  it('suggested order increases when stock is low', () => {
    const lowStock: InventoryRecord = { ...inventory, currentStock: 2 };
    const result = buildItemForecast({
      inventory: lowStock,
      salesHistory: makeHistory(inventory.upc, '2026-04-01', 60, 8),
      localEvents: [],
      today: new Date('2026-07-03T12:00:00.000Z'),
    });
    expect(result.suggestedOrder).toBeGreaterThan(0);
  });

  it('includes chart data points', () => {
    const result = buildItemForecast({
      inventory,
      salesHistory: makeHistory(inventory.upc, '2026-04-01', 30, 5),
      localEvents: [],
      today: new Date('2026-07-03T12:00:00.000Z'),
    });
    expect(result.chartData.length).toBeGreaterThan(0);
    expect(result.chartData[0]).toHaveProperty('date');
    expect(result.chartData[0]).toHaveProperty('predicted');
  });

  it.each([1.25, 1.5, 2.0, 3.0])('event multiplier %s boosts forecast', (multiplier) => {
    const today = new Date('2026-07-03T12:00:00.000Z');
    const history = makeHistory(inventory.upc, '2026-04-01', 60, 6);
    const baseline = buildItemForecast({ inventory, salesHistory: history, localEvents: [], today });
    const withEvent = buildItemForecast({
      inventory,
      salesHistory: history,
      localEvents: [
        {
          id: 'e',
          name: 'Event',
          startDate: '2026-07-10',
          endDate: '2026-07-12',
          multiplier,
        },
      ],
      today,
    });
    expect(withEvent.predictedDemand14d).toBeGreaterThanOrEqual(baseline.predictedDemand14d);
  });
});