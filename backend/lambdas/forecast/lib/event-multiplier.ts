import type { LocalEvent, StaticHoliday } from '../../../shared/types/forecast';
import { focusAdjustedMultiplier } from '../../../shared/lib/event-focus';
import { getStaticHolidaysBetween } from './static-holidays';

function overlaps(date: string, startDate: string, endDate: string): boolean {
  return date >= startDate && date <= endDate;
}

/** Storewide max multiplier (ignores focus). Used for badges / UI. */
export function getMultiplierForDate(
  date: string,
  localEvents: LocalEvent[],
  staticHolidays?: StaticHoliday[],
): number {
  const holidays = staticHolidays ?? getStaticHolidaysBetween(date, date);
  const multipliers = [1];

  for (const holiday of holidays) {
    if (overlaps(date, holiday.startDate, holiday.endDate)) {
      multipliers.push(holiday.multiplier);
    }
  }

  for (const event of localEvents) {
    if (overlaps(date, event.startDate, event.endDate)) {
      multipliers.push(event.multiplier);
    }
  }

  return Math.max(...multipliers);
}

/**
 * Per-SKU demand multiplier: local event + static holiday focuses
 * raise matching categories (beer for July 4, spirits for hunting, etc.).
 */
export function getItemMultiplierForDate(
  date: string,
  category: string,
  name: string,
  localEvents: LocalEvent[],
  staticHolidays?: StaticHoliday[],
): number {
  const holidays = staticHolidays ?? getStaticHolidaysBetween(date, date);
  const multipliers = [1];

  for (const holiday of holidays) {
    if (overlaps(date, holiday.startDate, holiday.endDate)) {
      multipliers.push(
        focusAdjustedMultiplier(holiday.multiplier, category, name, holiday.focuses),
      );
    }
  }

  for (const event of localEvents) {
    if (overlaps(date, event.startDate, event.endDate)) {
      multipliers.push(
        focusAdjustedMultiplier(event.multiplier, category, name, event.focuses),
      );
    }
  }

  return Math.max(...multipliers);
}

export function getActiveStaticHolidays(startDate: string, endDate: string): StaticHoliday[] {
  return getStaticHolidaysBetween(startDate, endDate);
}

/** Upcoming holidays within lookAheadDays (for stocking suggestions UI). */
export function getUpcomingHolidays(
  today: Date,
  lookAheadDays = 45,
): StaticHoliday[] {
  const start = today.toISOString().slice(0, 10);
  const endDate = new Date(today);
  endDate.setUTCDate(endDate.getUTCDate() + lookAheadDays);
  const end = endDate.toISOString().slice(0, 10);
  return getStaticHolidaysBetween(start, end).sort((a, b) =>
    a.startDate.localeCompare(b.startDate),
  );
}
