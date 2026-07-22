import { describe, expect, it } from 'vitest';
import {
  ILLUSTRATIVE_GAIN_PCT_PER_MONTH,
  buildForecastLearningStatus,
  earliestSaleDate,
} from '../lambdas/forecast/lib/forecast-learning';

describe('forecast learning status', () => {
  it('cites earliest Square sales date and monthly improvement', () => {
    const since = '2026-01-15';
    const status = buildForecastLearningStatus({
      basis: 'square_sales',
      salesDataSince: since,
      holidaysWithActuals: 1,
      pastHolidaysOnCalendar: 2,
      today: new Date('2026-07-21T12:00:00Z'),
    });

    expect(status.salesDataSince).toBe(since);
    expect(status.monthsOfHistory).toBe(6);
    expect(status.expectedImprovementPctPerMonth).toBe(ILLUSTRATIVE_GAIN_PCT_PER_MONTH);
    expect(status.plainEnglish).toContain('actual Square sales since');
    expect(status.plainEnglish).toContain('Jan');
    expect(status.plainEnglish).toMatch(/~6% improvement each month/);
    expect(status.holidaysWithActuals).toBe(1);
    expect(status.illustrativeAccuracyNextMonthPct).toBeGreaterThan(
      status.illustrativeAccuracyPct,
    );
  });

  it('explains proxy path when no sales yet', () => {
    const status = buildForecastLearningStatus({
      basis: 'inventory_proxy',
      salesDataSince: null,
    });
    expect(status.monthsOfHistory).toBe(0);
    expect(status.plainEnglish).toMatch(/Not enough Square sales history/);
  });

  it('finds earliest sale date across UPCs', () => {
    const map = new Map([
      [
        'a',
        [
          { date: '2026-03-01', quantity: 2 },
          { date: '2026-04-01', quantity: 1 },
        ],
      ],
      ['b', [{ date: '2026-02-10', quantity: 5 }]],
    ]);
    expect(earliestSaleDate(map)).toBe('2026-02-10');
  });
});
