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

  it('assigns confidence based on history depth', () => {
    const today = new Date('2026-07-03T12:00:00.000Z');

    const lowHistory = buildItemForecast({
      inventory,
      salesHistory: makeHistory(inventory.upc, '2026-06-25', 7, 5),
      localEvents: [],
      today,
    });

    const highHistory = buildItemForecast({
      inventory,
      salesHistory: makeHistory(inventory.upc, '2026-04-01', 90, 5),
      localEvents: [],
      today,
    });

    expect(lowHistory.confidence).toBe('low');
    expect(highHistory.confidence).toBe('high');
  });
});