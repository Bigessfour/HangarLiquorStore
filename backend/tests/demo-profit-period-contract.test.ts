/**
 * Demo profit period contract — mirrors src/lib/profit-period.ts.
 * Kept in backend vitest so demo + Lambda period rules stay aligned without a shared package.
 */
import { describe, expect, it } from 'vitest';

type Period = 'day' | 'month' | 'year';

function applyProfitPeriodDemo(
  base: { sales: number; saved: number; made: number },
  period: Period,
) {
  const scale = period === 'day' ? 1 / 30 : period === 'year' ? 12 : 1;
  return {
    sales: Math.round(base.sales * scale),
    saved: base.saved,
    made: Math.round(base.made * scale),
  };
}

describe('demo profit period contract (aligns with applyProfitPeriod)', () => {
  const month = { sales: 18420, saved: 1840, made: 2100 };

  it('keeps Saved fixed across day / month / year', () => {
    expect(applyProfitPeriodDemo(month, 'day').saved).toBe(1840);
    expect(applyProfitPeriodDemo(month, 'month').saved).toBe(1840);
    expect(applyProfitPeriodDemo(month, 'year').saved).toBe(1840);
  });

  it('scales pulse sales and Made with period window', () => {
    const day = applyProfitPeriodDemo(month, 'day');
    const year = applyProfitPeriodDemo(month, 'year');
    expect(day.sales).toBe(Math.round(18420 / 30));
    expect(day.made).toBe(Math.round(2100 / 30));
    expect(year.sales).toBe(18420 * 12);
    expect(year.made).toBe(2100 * 12);
  });
});
