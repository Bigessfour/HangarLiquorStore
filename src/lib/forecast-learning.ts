/**
 * Frontend copy of forecast-learning messaging (demo/mock path).
 * Keep in sync with backend/lambdas/forecast/lib/forecast-learning.ts
 */

export type ForecastLearningBasis =
  | 'demo_simulation'
  | 'inventory_proxy'
  | 'square_sales';

export interface ForecastLearningStatus {
  basis: ForecastLearningBasis;
  salesDataSince: string | null;
  monthsOfHistory: number;
  expectedImprovementPctPerMonth: number;
  illustrativeAccuracyPct: number;
  illustrativeAccuracyNextMonthPct: number;
  holidaysWithActuals: number;
  pastHolidaysOnCalendar: number;
  plainEnglish: string;
}

export const ILLUSTRATIVE_GAIN_PCT_PER_MONTH = 6;
export const ILLUSTRATIVE_BASE_ACCURACY_PCT = 38;
export const ILLUSTRATIVE_CAP_ACCURACY_PCT = 82;
export const ILLUSTRATIVE_HOLIDAY_BONUS_PCT = 4;
export const ILLUSTRATIVE_HOLIDAY_BONUS_CAP = 12;

function monthsBetween(sinceYmd: string, today = new Date()): number {
  const s = new Date(`${sinceYmd}T12:00:00Z`);
  if (Number.isNaN(s.getTime())) return 0;
  const months =
    (today.getUTCFullYear() - s.getUTCFullYear()) * 12 +
    (today.getUTCMonth() - s.getUTCMonth());
  return Math.max(0, months);
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

/** Simulated earliest Square date for demo (~90-day lookback). */
export function demoSimulatedSalesSince(today = new Date()): string {
  const d = new Date(today);
  d.setUTCDate(d.getUTCDate() - 90);
  return d.toISOString().slice(0, 10);
}
