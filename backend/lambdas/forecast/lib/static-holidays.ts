import type { EventFocusTag, StaticHoliday } from '../../../shared/types/forecast';

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

function lastWeekdayOfMonth(year: number, month: number, weekday: number): Date {
  const date = new Date(year, month + 1, 0);
  while (date.getDay() !== weekday) {
    date.setDate(date.getDate() - 1);
  }
  return date;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function range(
  start: Date,
  end: Date,
  multiplier: number,
  id: string,
  name: string,
  focuses: EventFocusTag[],
  stockingNote: string,
): StaticHoliday {
  return {
    id,
    name,
    startDate: formatDate(start),
    endDate: formatDate(end),
    multiplier,
    focuses,
    stockingNote,
  };
}

/** Super Bowl is the second Sunday in February (retail planning approximation). */
function superBowlSunday(year: number): Date {
  return nthWeekdayOfMonth(year, 1, 0, 2);
}

/**
 * High-demand U.S. alcohol retail holidays.
 * Multipliers / windows informed by off-premise industry reports:
 * - New Year's Eve often largest single-day spike (~150%+ vs average)
 * - Day before Thanksgiving ("Turkey Wednesday") ~130%+ lift
 * - Christmas Eve / Dec 23 among busiest December days
 * - Summer: Memorial Day, July 4, Labor Day — beer/RTD peak 1–2 days before
 * - Halloween / Día de los Muertos: notable OND spend
 * Local festivals (Hay Days, hunting, rodeos) stay as Manager local events.
 */
export function getStaticHolidaysForYear(year: number): StaticHoliday[] {
  const thanksgiving = nthWeekdayOfMonth(year, 10, 4, 4);
  const laborDay = nthWeekdayOfMonth(year, 8, 1, 1);
  const memorialDay = lastWeekdayOfMonth(year, 4, 1);
  const fathersDay = nthWeekdayOfMonth(year, 5, 0, 3);
  const sb = superBowlSunday(year);

  return [
    range(
      new Date(year - 1, 11, 30),
      new Date(year, 0, 1),
      2.6,
      'new-years',
      "New Year's Eve",
      ['Spirits', 'Beer/RTD', 'Essentials'],
      'Biggest party night — stock champagne/sparkling, vodka, beer, ice early (shoppers buy 1–2 days ahead).',
    ),
    range(
      addDays(new Date(year, 1, 14), -1),
      new Date(year, 1, 14),
      1.6,
      'valentines',
      "Valentine's Day",
      ['Spirits', 'Essentials'],
      'Wine and premium spirits for gifts — lighter beer lift.',
    ),
    range(
      addDays(sb, -1),
      sb,
      2.0,
      'super-bowl',
      'Super Bowl Weekend',
      ['Beer/RTD', 'Ice', 'Essentials'],
      'Beer, RTD, ice, and snacks mixers — stock the Friday/Saturday before kickoff.',
    ),
    range(
      addDays(new Date(year, 2, 17), -1),
      addDays(new Date(year, 2, 17), 1),
      2.2,
      'st-patricks',
      "St. Patrick's Day",
      ['Beer/RTD', 'Spirits'],
      'Beer and whiskey spike — cover the weekend around March 17.',
    ),
    range(
      addDays(new Date(year, 4, 5), -1),
      new Date(year, 4, 5),
      1.8,
      'cinco-de-mayo',
      'Cinco de Mayo',
      ['Beer/RTD', 'Spirits'],
      'Beer, tequila, and mixers — weekend before if the 5th is midweek.',
    ),
    range(
      addDays(memorialDay, -2),
      memorialDay,
      2.1,
      'memorial-day',
      'Memorial Day Weekend',
      ['Beer/RTD', 'Ice', 'Essentials'],
      'First big summer BBQ weekend — beer, RTD, and ice peak Fri–Sat before Monday.',
    ),
    range(
      addDays(fathersDay, -1),
      fathersDay,
      1.7,
      'fathers-day',
      "Father's Day",
      ['Beer/RTD', 'Spirits'],
      'Beer and whiskey gift sets — Saturday before often stronger than Sunday.',
    ),
    range(
      new Date(year, 6, 2),
      new Date(year, 6, 5),
      2.8,
      'july-4th',
      'July 4th Weekend',
      ['Beer/RTD', 'Ice', 'Essentials'],
      'Top summer holiday — beer, ice, and cooler fills; stock 2–3 days early.',
    ),
    range(
      addDays(laborDay, -2),
      laborDay,
      2.0,
      'labor-day',
      'Labor Day Weekend',
      ['Beer/RTD', 'Ice', 'Essentials'],
      'Last big summer weekend — beer/RTD and ice again; shoppers buy Fri–Sat.',
    ),
    range(
      new Date(year, 9, 30),
      new Date(year, 10, 1),
      2.0,
      'halloween',
      'Halloween',
      ['Spirits', 'Beer/RTD', 'Essentials'],
      'Adult Halloween / Día de los Muertos spend — spirits, beer, and party mixers.',
    ),
    range(
      addDays(thanksgiving, -1),
      addDays(thanksgiving, 1),
      2.5,
      'thanksgiving',
      'Thanksgiving',
      ['Spirits', 'Beer/RTD', 'Essentials'],
      'Turkey Wednesday is one of the biggest off-premise days — wine, spirits, and beer for gatherings.',
    ),
    range(
      new Date(year, 11, 22),
      new Date(year, 11, 25),
      2.4,
      'christmas',
      'Christmas',
      ['Spirits', 'Beer/RTD', 'Essentials'],
      'Dec 23–24 among busiest days — gift bottles, wine, and party stock before Christmas Eve.',
    ),
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
