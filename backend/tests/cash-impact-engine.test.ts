import { describe, expect, it } from 'vitest';
import {
  buildCashOptimizationImpact,
  computeSkuCashImpacts,
  resolveCoverPolicy,
  unitCost,
} from '../lambdas/forecast/lib/cash-impact-engine';
import type { ItemForecast, InventoryRecord, LocalEvent, SalesRecord } from '../shared/types/forecast';

const today = new Date('2026-07-21T12:00:00.000Z');

function forecastFor(
  item: InventoryRecord,
  predicted14: number,
  confidence: 'high' | 'medium' | 'low' = 'medium',
): ItemForecast {
  return {
    upc: item.upc,
    name: item.name,
    category: item.category,
    currentStock: item.currentStock,
    predictedDemand14d: predicted14,
    suggestedOrder: Math.max(0, predicted14 - item.currentStock),
    confidence,
    source: 'statistical',
    chartData: Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() + i + 1);
      const predicted = Math.round(predicted14 / 14);
      return {
        date: d.toISOString().slice(0, 10),
        predicted,
        lower: Math.round(predicted * 0.7),
        upper: Math.round(predicted * 1.3),
      };
    }),
  };
}

describe('resolveCoverPolicy', () => {
  it('uses beer vs premium spirits rules', () => {
    expect(resolveCoverPolicy('Beer', 'Coors Light').safetyDays).toBe(6);
    expect(resolveCoverPolicy('Spirits', "Jack Daniel's Tennessee Whiskey").safetyDays).toBe(37);
    expect(resolveCoverPolicy('Spirits', "Tito's Handmade Vodka").safetyDays).toBe(17);
  });
});

describe('computeSkuCashImpacts', () => {
  it('high excess beer → hold + cashTiedUp / overstock dollars', () => {
    const beer: InventoryRecord = {
      upc: 'beer1',
      name: 'Coors Light 12pk',
      category: 'Beer',
      currentStock: 200,
      reorderPoint: 24,
    };
    // Low velocity so cover is huge
    const sales = new Map<string, SalesRecord[]>([
      [
        'beer1',
        Array.from({ length: 30 }, (_, i) => {
          const d = new Date(today);
          d.setUTCDate(d.getUTCDate() - i);
          return { upc: 'beer1', date: d.toISOString().slice(0, 10), quantity: 1 };
        }),
      ],
    ]);
    const impacts = computeSkuCashImpacts({
      inventory: [beer],
      forecasts: [forecastFor(beer, 14)],
      salesByUpc: sales,
      events: [],
      dayCount: 30,
      today,
      velocityDays: 30,
    });
    const sku = impacts[0];
    expect(sku.excessUnits).toBeGreaterThan(2);
    expect(sku.overstockDollars).toBeGreaterThan(0);
    expect(sku.cashTiedUp).toBe(sku.overstockDollars);
    expect(sku.action).toBe('hold');
    expect(sku.daysOfCover).toBeGreaterThan(sku.targetCover);
  });

  it('low cover with Hay Days multiplier → order + dollarsMade path', () => {
    const beer: InventoryRecord = {
      upc: 'beer2',
      name: 'Bud Light 12pk',
      category: 'Beer',
      currentStock: 5,
      reorderPoint: 24,
    };
    const sales = new Map<string, SalesRecord[]>([
      [
        'beer2',
        Array.from({ length: 14 }, (_, i) => {
          const d = new Date(today);
          d.setUTCDate(d.getUTCDate() - i);
          return { upc: 'beer2', date: d.toISOString().slice(0, 10), quantity: 4 };
        }),
      ],
    ]);
    const events: LocalEvent[] = [
      {
        id: 'hay',
        name: 'Hay Days',
        startDate: '2026-07-01',
        endDate: '2026-07-31',
        multiplier: 1.8,
        focuses: ['Ice', 'Beer/RTD'],
      },
    ];
    const impacts = computeSkuCashImpacts({
      inventory: [beer],
      forecasts: [forecastFor(beer, 56, 'high')],
      salesByUpc: sales,
      events,
      dayCount: 30,
      today,
      velocityDays: 14,
    });
    const sku = impacts[0];
    expect(sku.daysOfCover).toBeLessThan(sku.targetCover);
    expect(sku.action).toBe('order');
    expect(sku.stockoutRiskDollars).toBeGreaterThan(0);
  });

  it('empty sales history → limitedHistory + category average', () => {
    const spirit: InventoryRecord = {
      upc: 'sp1',
      name: "Tito's Handmade Vodka",
      category: 'Spirits',
      currentStock: 12,
    };
    const impacts = computeSkuCashImpacts({
      inventory: [spirit],
      forecasts: [forecastFor(spirit, 0, 'low')],
      salesByUpc: new Map(),
      events: [],
      dayCount: 30,
      today,
    });
    expect(impacts[0].limitedHistory).toBe(true);
    expect(impacts[0].reason.toLowerCase()).toMatch(/limited history|category average|let it run/);
  });
});

describe('buildCashOptimizationImpact', () => {
  it('aggregates saved/made and ranks recommendations', () => {
    const beer: InventoryRecord = {
      upc: 'b',
      name: 'Coors Light 12pk',
      category: 'Beer',
      currentStock: 180,
    };
    const sales = new Map<string, SalesRecord[]>([
      [
        'b',
        Array.from({ length: 30 }, (_, i) => {
          const d = new Date(today);
          d.setUTCDate(d.getUTCDate() - i);
          return { upc: 'b', date: d.toISOString().slice(0, 10), quantity: 1 };
        }),
      ],
    ]);
    const impact = buildCashOptimizationImpact({
      inventory: [beer],
      forecasts: [forecastFor(beer, 14)],
      salesByUpc: sales,
      events: [],
      period: 'month',
      dayCount: 30,
      today,
      provenance: 'statistical',
    });
    expect(impact.dollarsSaved).toBeGreaterThan(0);
    expect(impact.provenance).toBe('statistical');
    expect(impact.confidence).toMatch(/high|medium|low/);
    expect(impact.recommendations.length).toBeGreaterThan(0);
    expect(impact.recommendations[0].cashTiedUp).toBeGreaterThan(0);
  });

  it('does not double-count event uplift into dollarsMade', () => {
    const beer: InventoryRecord = {
      upc: 'ev1',
      name: 'Bud Light 12pk',
      category: 'Beer',
      currentStock: 5,
    };
    const sales = new Map<string, SalesRecord[]>([
      [
        'ev1',
        Array.from({ length: 14 }, (_, i) => {
          const d = new Date(today);
          d.setUTCDate(d.getUTCDate() - i);
          return { upc: 'ev1', date: d.toISOString().slice(0, 10), quantity: 4 };
        }),
      ],
    ]);
    const events: LocalEvent[] = [
      {
        id: 'hay',
        name: 'Hay Days',
        startDate: '2026-07-01',
        endDate: '2026-07-31',
        multiplier: 1.8,
      },
    ];
    const withEvent = buildCashOptimizationImpact({
      inventory: [beer],
      forecasts: [forecastFor(beer, 56, 'high')],
      salesByUpc: sales,
      events,
      period: 'month',
      dayCount: 30,
      today,
    });
    // Same defaults as buildCashOptimizationImpact (velocityDays 90)
    const skusOnly = computeSkuCashImpacts({
      inventory: [beer],
      forecasts: [forecastFor(beer, 56, 'high')],
      salesByUpc: sales,
      events,
      dayCount: 30,
      today,
    });
    const skuMade = skusOnly.reduce((s, x) => s + x.stockoutRiskDollars, 0);
    expect(withEvent.dollarsMade).toBe(Math.round(skuMade));
    const eventRow = withEvent.recommendations.find((r) => r.upc === 'event');
    expect(eventRow?.dollarsImpact ?? 0).toBe(0);
  });

  it('zero-sales stock is promote/hold not order from category velocity', () => {
    const whiskey: InventoryRecord = {
      upc: 'w1',
      name: "Jack Daniel's Tennessee Whiskey 750ml",
      category: 'Spirits',
      currentStock: 8,
    };
    const impacts = computeSkuCashImpacts({
      inventory: [whiskey],
      forecasts: [forecastFor(whiskey, 0, 'low')],
      salesByUpc: new Map([['w1', []]]),
      events: [],
      dayCount: 30,
      today,
      velocityDays: 90,
    });
    expect(impacts[0].action).not.toBe('order');
    expect(impacts[0].cashTiedUp).toBeGreaterThan(0);
    expect(['promote', 'hold', 'run']).toContain(impacts[0].action);
  });

  it('year vs month does not change overstock Saved (fixed velocity window)', () => {
    expect(unitCost('Beer', 'Coors')).toBeCloseTo(12 * 0.72);
    const beer: InventoryRecord = {
      upc: 'b2',
      name: 'Coors Light 12pk',
      category: 'Beer',
      currentStock: 50,
    };
    const sales = new Map<string, SalesRecord[]>([
      [
        'b2',
        Array.from({ length: 30 }, (_, i) => {
          const d = new Date(today);
          d.setUTCDate(d.getUTCDate() - i);
          return { upc: 'b2', date: d.toISOString().slice(0, 10), quantity: 2 };
        }),
      ],
    ]);
    const month = buildCashOptimizationImpact({
      inventory: [beer],
      forecasts: [forecastFor(beer, 28)],
      salesByUpc: sales,
      events: [],
      period: 'month',
      dayCount: 30,
      today,
    });
    const year = buildCashOptimizationImpact({
      inventory: [beer],
      forecasts: [forecastFor(beer, 28)],
      salesByUpc: sales,
      events: [],
      period: 'year',
      dayCount: 365,
      today,
    });
    expect(year.dollarsSaved).toBe(month.dollarsSaved);
  });
});
