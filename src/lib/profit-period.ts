import type { ProfitOpsSnapshot, ProfitPeriod } from '@/types/profit';

/**
 * Apply Day / Month / Year view to a demo profit snapshot.
 *
 * Aligns with the Lambda cash-impact engine:
 * - Pulse sales / units / category mix scale with the selected window
 * - dollarsSaved (overstock cash tied up) stays fixed — cover math uses a fixed velocity window
 * - dollarsMade (stockout-risk margin) scales with period length (dayCount)
 */
export function applyProfitPeriod(
  base: ProfitOpsSnapshot,
  period: ProfitPeriod,
): ProfitOpsSnapshot {
  const labels = { day: 'Today', month: 'Last 30 days', year: 'Last 12 months' } as const;
  const scale = period === 'day' ? 1 / 30 : period === 'year' ? 12 : 1;
  return {
    ...base,
    period,
    periodLabel: labels[period],
    generatedAt: new Date().toISOString(),
    pulse: {
      ...base.pulse,
      salesDollars: Math.round(base.pulse.salesDollars * scale),
      unitsSold: Math.round(base.pulse.unitsSold * scale),
    },
    optimization: {
      ...base.optimization,
      dollarsSaved: base.optimization.dollarsSaved,
      dollarsMade: Math.round(base.optimization.dollarsMade * scale),
    },
    categoryMix: base.categoryMix.map((c) => ({
      ...c,
      salesDollars: Math.round(c.salesDollars * scale),
      units: Math.round(c.units * scale),
    })),
  };
}
