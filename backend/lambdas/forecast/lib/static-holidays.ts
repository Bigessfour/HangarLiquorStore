import type { StaticHoliday } from '../../../shared/types/forecast';

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  const date = new Date(year, month, 1);
  let count = 0;
  while (date.getMonth() === month) {
    if (date.getDay() === weekday) {
      count += 1;
      if (count === n) return new Date(date);
    }
    date.setDate(date.getDate() + 1);
  }
  throw new Error(`Could not find weekday ${weekday} occurrence ${n} in month ${month}`);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function range(start: Date, end: Date, multiplier: number, id: string, name: string): StaticHoliday {
  return {
    id,
    name,
    startDate: formatDate(start),
    endDate: formatDate(end),
    multiplier,
  };
}

// Super Bowl is the second Sunday in February (approximation for retail planning).
function superBowlSunday(year: number): Date {
  return nthWeekdayOfMonth(year, 1, 0, 2);
}

export function getStaticHolidaysForYear(year: number): StaticHoliday[] {
  const thanksgiving = nthWeekdayOfMonth(year, 10, 4, 4);
  const laborDay = nthWeekdayOfMonth(year, 8, 1, 1);
  const sb = superBowlSunday(year);

  return [
    range(new Date(year - 1, 11, 31), new Date(year, 0, 1), 2.0, 'new-years', "New Year's"),
    range(addDays(new Date(year, 2, 17), -1), addDays(new Date(year, 2, 17), 1), 2.2, 'st-patricks', "St. Patrick's Day"),
    range(new Date(year, 6, 3), new Date(year, 6, 5), 2.8, 'july-4th', 'July 4th Weekend'),
    range(addDays(laborDay, -1), addDays(laborDay, 1), 2.0, 'labor-day', 'Labor Day Weekend'),
    range(addDays(thanksgiving, -1), addDays(thanksgiving, 1), 2.5, 'thanksgiving', 'Thanksgiving'),
    range(new Date(year, 11, 24), new Date(year, 11, 25), 2.3, 'christmas', 'Christmas'),
    range(addDays(sb, -1), sb, 2.0, 'super-bowl', 'Super Bowl Weekend'),
  ];
}

export function getStaticHolidaysBetween(startDate: string, endDate: string): StaticHoliday[] {
  const startYear = Number(startDate.slice(0, 4));
  const endYear = Number(endDate.slice(0, 4));
  const holidays: StaticHoliday[] = [];

  for (let year = startYear - 1; year <= endYear + 1; year += 1) {
    holidays.push(...getStaticHolidaysForYear(year));
  }

  return holidays.filter(
    (holiday) => holiday.endDate >= startDate && holiday.startDate <= endDate,
  );
}