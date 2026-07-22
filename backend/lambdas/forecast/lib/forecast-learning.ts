/**
 * Illustrative forecast-learning curve for sparse liquor-store POS.
 * Not a contractual accuracy SLA — used for honest owner messaging:
 * “based on your Square sales since X; tightens as months + holiday actuals accumulate.”
 */

export type ForecastLearningBasis =
  | 'demo_simulation'
  | 'inventory_proxy'
  | 'square_sales';

export interface ForecastLearningStatus {
  basis: ForecastLearningBasis;
  /** YYYY-MM-DD of earliest sales row (Square sync / history), if any */
  salesDataSince: string | null;
  monthsOfHistory: number;
  /**
   * Illustrative expected gain in demand-fit per additional month of sales.
   * Drops after ~12 months (seasonal cycle mostly seen).
   */
  expectedImprovementPctPerMonth: number;
  /** Rough illustrative “how much we trust demand” band, 0–100 */
  illustrativeAccuracyPct: number;
  /** Same band after one more month of sales (illustrative) */
  illustrativeAccuracyNextMonthPct: number;
  /** Past holidays/events where we saw any sales during the window */
  holidaysWithActuals: number;
  /** Past holidays/events on the calendar (eligible to learn from) */
  pastHolidaysOnCalendar: number;
  /** One owner-facing paragraph */
  plainEnglish: string;
}

/** ~pts of illustrative accuracy per month of Square history (first year). */
export const ILLUSTRATIVE_GAIN_PCT_PER_MONTH = 6;
/** Starting band with almost no POS history (proxy / thin). */
export const ILLUSTRATIVE_BASE_ACCURACY_PCT = 38;
/** Soft ceiling — retail demand never becomes perfect. */
export const ILLUSTRATIVE_CAP_ACCURACY_PCT = 82;
/** Bonus per past holiday/event with actual sales in-window. */
export const ILLUSTRATIVE_HOLIDAY_BONUS_PCT = 4;
export const ILLUSTRATIVE_HOLIDAY_BONUS_CAP = 12;

export interface SalesDateRow {
  date: string;
  quantity: number;
}

export interface EventDateRow {
  name: string;
  startDate: string;
  endDate: string;
}

function monthsBetween(sinceYmd: string, today = new Date()): number {
  const s = new Date(`${sinceYmd}T12:00:00Z`);
  if (Number.isNaN(s.getTime())) return 0;
  const months =
    (today.getUTCFullYear() - s.getUTCFullYear()) * 12 +
    (today.getUTCMonth() - s.getUTCMonth());
  return Math.max(0, months);
}

export function earliestSaleDate(
  salesByUpc: Map<string, SalesDateRow[]> | Iterable<SalesDateRow[]>,
): string | null {
  let min: string | null = null;
  const lists =
    salesByUpc instanceof Map ? salesByUpc.values() : salesByUpc;
  for (const rows of lists) {
    for (const row of rows) {
      if (!row.date) continue;
      if (!min || row.date < min) min = row.date;
    }
  }
  return min;
}

export function countPastHolidaysWithSales(
  events: EventDateRow[],
  salesByUpc: Map<string, SalesDateRow[]>,
  todayYmd = new Date().toISOString().slice(0, 10),
): { pastOnCalendar: number; withActuals: number } {
  let pastOnCalendar = 0;
  let withActuals = 0;
  for (const e of events) {
    if (e.endDate >= todayYmd) continue;
    pastOnCalendar += 1;
    let has = false;
    for (const rows of salesByUpc.values()) {
      if (
        rows.some(
          (r) =>
            r.quantity > 0 && r.date >= e.startDate && r.date <= e.endDate,
        )
      ) {
        has = true;
        break;
      }
    }
    if (has) withActuals += 1;
  }
  return { pastOnCalendar, withActuals };
}

function formatSince(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function clampAccuracy(n: number): number {
  return Math.max(
    ILLUSTRATIVE_BASE_ACCURACY_PCT,
    Math.min(ILLUSTRATIVE_CAP_ACCURACY_PCT, Math.round(n)),
  );
}

export function buildForecastLearningStatus(input: {
  basis: ForecastLearningBasis;
  salesDataSince: string | null;
  holidaysWithActuals?: number;
  pastHolidaysOnCalendar?: number;
  today?: Date;
}): ForecastLearningStatus {
  const today = input.today ?? new Date();
  const monthsOfHistory = input.salesDataSince
    ? monthsBetween(input.salesDataSince, today)
    : 0;
  const holidayBonus = Math.min(
    ILLUSTRATIVE_HOLIDAY_BONUS_CAP,
    (input.holidaysWithActuals ?? 0) * ILLUSTRATIVE_HOLIDAY_BONUS_PCT,
  );
  const expectedImprovementPctPerMonth =
    monthsOfHistory >= 12 ? 2 : ILLUSTRATIVE_GAIN_PCT_PER_MONTH;

  const illustrativeAccuracyPct = clampAccuracy(
    ILLUSTRATIVE_BASE_ACCURACY_PCT +
      monthsOfHistory * ILLUSTRATIVE_GAIN_PCT_PER_MONTH +
      holidayBonus,
  );
  const illustrativeAccuracyNextMonthPct = clampAccuracy(
    illustrativeAccuracyPct + expectedImprovementPctPerMonth,
  );

  const holidaysWithActuals = input.holidaysWithActuals ?? 0;
  const pastHolidaysOnCalendar = input.pastHolidaysOnCalendar ?? 0;

  let plainEnglish: string;
  if (input.basis === 'demo_simulation') {
    plainEnglish = input.salesDataSince
      ? `Demo simulation: numbers are shaped like Square sales since ${formatSince(input.salesDataSince)} (~${monthsOfHistory} mo). With live Square, expect ~${expectedImprovementPctPerMonth}% tighter demand-fit each month as history grows, and better holiday forecasts once actual festival/hunting sales are recorded. Illustrative trust band ~${illustrativeAccuracyPct}% → ~${illustrativeAccuracyNextMonthPct}% next month.`
      : `Demo simulation — not Hangar’s register. After Owner connects Square, results will cite your real sales from the earliest sync date and tighten ~${ILLUSTRATIVE_GAIN_PCT_PER_MONTH}% per month of history, plus more when holiday actuals are recorded.`;
  } else if (input.basis === 'inventory_proxy' || !input.salesDataSince) {
    plainEnglish = `Not enough Square sales history yet — estimates use inventory + patterns. After Connect + Sync, results will be based on your actual sales from the earliest date we have, improve about ~${ILLUSTRATIVE_GAIN_PCT_PER_MONTH}% each month as data accumulates, and tighten further when you record real holiday/event sales (Hay Days, hunting, etc.).`;
  } else {
    const holidayLine =
      pastHolidaysOnCalendar > 0
        ? ` Holiday learning: ${holidaysWithActuals} of ${pastHolidaysOnCalendar} past calendar events have sales in-window — logging actuals for the rest improves those multipliers next time.`
        : ` As you record actual holiday/event sales (Hay Days, hunting), those seasonal forecasts improve next year.`;
    plainEnglish = `Based on your actual Square sales since ${formatSince(input.salesDataSince)} (~${monthsOfHistory} mo of history). Illustrative demand-fit ~${illustrativeAccuracyPct}% now; expect about ~${expectedImprovementPctPerMonth}% improvement each month as more register data lands (gains slow after ~12 months).${holidayLine}`;
  }

  return {
    basis: input.basis,
    salesDataSince: input.salesDataSince,
    monthsOfHistory,
    expectedImprovementPctPerMonth,
    illustrativeAccuracyPct,
    illustrativeAccuracyNextMonthPct,
    holidaysWithActuals,
    pastHolidaysOnCalendar,
    plainEnglish,
  };
}
