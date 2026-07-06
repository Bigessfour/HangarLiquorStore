import { describe, expect, it } from 'vitest';
import {
  getStaticHolidaysBetween,
  getStaticHolidaysForYear,
} from '../lambdas/forecast/lib/static-holidays';

describe('getStaticHolidaysForYear', () => {
  it.each([2024, 2025, 2026, 2027])('returns holidays for year %s', (year) => {
    const holidays = getStaticHolidaysForYear(year);
    expect(holidays.length).toBeGreaterThan(5);
    expect(holidays.some((h) => h.id === 'july-4th')).toBe(true);
    expect(holidays.some((h) => h.id === 'new-years')).toBe(true);
  });

  it('july 4th spans early July', () => {
    const july = getStaticHolidaysForYear(2026).find((h) => h.id === 'july-4th');
    expect(july?.startDate).toMatch(/^2026-07-/);
    expect(july?.endDate).toMatch(/^2026-07-/);
    expect(july?.multiplier).toBeGreaterThan(2);
  });
});

describe('getStaticHolidaysBetween', () => {
  it('filters to date range', () => {
    const inRange = getStaticHolidaysBetween('2026-07-01', '2026-07-10');
    expect(inRange.some((h) => h.id === 'july-4th')).toBe(true);
    expect(inRange.every((h) => h.endDate >= '2026-07-01' && h.startDate <= '2026-07-10')).toBe(true);
  });

  it('returns empty for range with no holidays', () => {
    const none = getStaticHolidaysBetween('2026-02-10', '2026-02-15');
    expect(none.length).toBe(0);
  });
});