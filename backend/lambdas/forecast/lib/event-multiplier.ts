import type { LocalEvent, StaticHoliday } from '../../../shared/types/forecast';
import { getStaticHolidaysBetween } from './static-holidays';

function overlaps(date: string, startDate: string, endDate: string): boolean {
  return date >= startDate && date <= endDate;
}

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

export function getActiveStaticHolidays(startDate: string, endDate: string): StaticHoliday[] {
  return getStaticHolidaysBetween(startDate, endDate);
}