import { describe, expect, it } from 'vitest';
import { getMultiplierForDate } from '../lambdas/forecast/lib/event-multiplier';
import type { LocalEvent } from '../shared/types/forecast';

const july4: LocalEvent = {
  id: 'j4',
  name: 'July 4th',
  startDate: '2026-07-03',
  endDate: '2026-07-05',
  multiplier: 2.8,
};

const rodeo: LocalEvent = {
  id: 'r1',
  name: 'Rodeo',
  startDate: '2026-08-01',
  endDate: '2026-08-03',
  multiplier: 1.6,
};

describe('getMultiplierForDate', () => {
  it('returns 1 with no events', () => {
    expect(getMultiplierForDate('2026-06-01', [], [])).toBe(1);
  });

  it('applies local event multiplier on overlap', () => {
    expect(getMultiplierForDate('2026-07-04', [july4], [])).toBe(2.8);
  });

  it('returns 1 outside event range', () => {
    expect(getMultiplierForDate('2026-06-01', [july4], [])).toBe(1);
  });

  it('uses max of overlapping events', () => {
    const overlap: LocalEvent = {
      ...rodeo,
      startDate: '2026-07-04',
      endDate: '2026-07-04',
      multiplier: 3.5,
    };
    expect(getMultiplierForDate('2026-07-04', [july4, overlap], [])).toBe(3.5);
  });

  it.each([
    ['2026-07-03', 2.8],
    ['2026-07-04', 2.8],
    ['2026-07-05', 2.8],
    ['2026-07-06', 1],
  ])('july 4 window date %s => %s', (date, expected) => {
    expect(getMultiplierForDate(date, [july4], [])).toBe(expected);
  });

  it('includes static holiday multipliers when provided', () => {
    const holidays = [
      {
        id: 'test',
        name: 'Test Holiday',
        startDate: '2026-12-24',
        endDate: '2026-12-26',
        multiplier: 2.0,
      },
    ];
    expect(getMultiplierForDate('2026-12-25', [], holidays)).toBe(2.0);
  });
});