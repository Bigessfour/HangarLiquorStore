import { describe, expect, it } from 'vitest';
import {
  getStaticHolidaysBetween,
  getStaticHolidaysForYear,
} from '../lambdas/forecast/lib/static-holidays';
import { getItemMultiplierForDate } from '../lambdas/forecast/lib/event-multiplier';
import { buildHolidayStockingSuggestions } from '../lambdas/forecast/lib/holiday-stocking';

describe('getStaticHolidaysForYear', () => {
  it.each([2024, 2025, 2026, 2027])('returns holidays for year %s', (year) => {
    const holidays = getStaticHolidaysForYear(year);
    expect(holidays.length).toBeGreaterThanOrEqual(10);
    expect(holidays.some((h) => h.id === 'july-4th')).toBe(true);
    expect(holidays.some((h) => h.id === 'new-years')).toBe(true);
    expect(holidays.some((h) => h.id === 'memorial-day')).toBe(true);
    expect(holidays.some((h) => h.id === 'halloween')).toBe(true);
    expect(holidays.some((h) => h.id === 'thanksgiving')).toBe(true);
    expect(holidays.every((h) => (h.focuses?.length ?? 0) > 0)).toBe(true);
  });

  it('july 4th spans early July', () => {
    const july = getStaticHolidaysForYear(2026).find((h) => h.id === 'july-4th');
    expect(july?.startDate).toMatch(/^2026-07-/);
    expect(july?.endDate).toMatch(/^2026-07-/);
    expect(july?.multiplier).toBeGreaterThan(2);
    expect(july?.focuses).toContain('Beer/RTD');
  });
});

describe('getStaticHolidaysBetween', () => {
  it('filters to date range', () => {
    const inRange = getStaticHolidaysBetween('2026-07-01', '2026-07-10');
    expect(inRange.some((h) => h.id === 'july-4th')).toBe(true);
    expect(inRange.every((h) => h.endDate >= '2026-07-01' && h.startDate <= '2026-07-10')).toBe(
      true,
    );
  });

  it('returns empty for quiet mid-month window', () => {
    const none = getStaticHolidaysBetween('2026-04-10', '2026-04-15');
    expect(none.length).toBe(0);
  });
});

describe('getItemMultiplierForDate', () => {
  it('applies full lift to beer on July 4 and dampens spirits', () => {
    const beer = getItemMultiplierForDate('2026-07-04', 'Beer', 'Coors Light 12pk', []);
    const spirits = getItemMultiplierForDate('2026-07-04', 'Spirits', "Jack Daniel's 750ml", []);
    expect(beer).toBeGreaterThan(2);
    expect(spirits).toBeLessThan(beer);
    expect(spirits).toBeGreaterThan(1);
  });

  it('respects local event focuses', () => {
    const events = [
      {
        id: 'hunt',
        name: 'Hunting Season Opener',
        startDate: '2026-10-17',
        endDate: '2026-10-19',
        multiplier: 1.55,
        focuses: ['Spirits' as const],
      },
    ];
    const spirits = getItemMultiplierForDate(
      '2026-10-18',
      'Spirits',
      "Jack Daniel's",
      events,
      [],
    );
    const beer = getItemMultiplierForDate('2026-10-18', 'Beer', 'Bud Light', events, []);
    expect(spirits).toBe(1.55);
    expect(beer).toBeLessThan(spirits);
  });
});

describe('buildHolidayStockingSuggestions', () => {
  it('suggests extra units before a high-demand holiday', () => {
    const suggestions = buildHolidayStockingSuggestions({
      today: new Date('2026-06-20T12:00:00Z'),
      lookAheadDays: 30,
      inventory: [
        { upc: '1', name: 'Bud Light 12pk', category: 'Beer', currentStock: 10 },
        { upc: '2', name: "Jack Daniel's", category: 'Spirits', currentStock: 40 },
      ],
      forecasts: [
        {
          upc: '1',
          name: 'Bud Light 12pk',
          category: 'Beer',
          currentStock: 10,
          predictedDemand14d: 70,
          suggestedOrder: 20,
          confidence: 'high',
          source: 'statistical',
          chartData: [],
        },
        {
          upc: '2',
          name: "Jack Daniel's",
          category: 'Spirits',
          currentStock: 40,
          predictedDemand14d: 14,
          suggestedOrder: 0,
          confidence: 'medium',
          source: 'statistical',
          chartData: [],
        },
      ],
    });
    expect(suggestions.some((s) => s.holidayId === 'july-4th')).toBe(true);
    const july = suggestions.find((s) => s.holidayId === 'july-4th');
    expect(july?.suggestedSkus.some((s) => s.upc === '1')).toBe(true);
  });
});
