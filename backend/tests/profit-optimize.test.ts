import { describe, expect, it } from 'vitest';
import {
  buildOptimizationImpact,
  buildProfitSnapshot,
  periodWindow,
} from '../lambdas/forecast/lib/profit-engine';
import { groundedAssistantReply } from '../lambdas/forecast/lib/assistant';
import type { ItemForecast, InventoryRecord, LocalEvent } from '../shared/types/forecast';

const inventory: InventoryRecord[] = [
  { upc: '1', name: 'Coors Light 12pk', category: 'Beer', currentStock: 10, reorderPoint: 24 },
  { upc: '2', name: "Tito's Vodka", category: 'Spirits', currentStock: 20, reorderPoint: 8 },
];

const forecasts: ItemForecast[] = [
  {
    upc: '1',
    name: 'Coors Light 12pk',
    category: 'Beer',
    currentStock: 10,
    predictedDemand14d: 40,
    suggestedOrder: 20,
    confidence: 'medium',
    source: 'statistical',
    chartData: [],
  },
  {
    upc: '2',
    name: "Tito's Vodka",
    category: 'Spirits',
    currentStock: 20,
    predictedDemand14d: 8,
    suggestedOrder: 0,
    confidence: 'high',
    source: 'statistical',
    chartData: [],
  },
];

const events: LocalEvent[] = [
  {
    id: 'e1',
    name: 'Hay Days',
    startDate: '2020-01-01',
    endDate: '2099-12-31',
    multiplier: 1.5,
    focuses: ['Ice', 'Beer/RTD'],
  },
];

describe('profit-engine', () => {
  it('builds period windows', () => {
    const month = periodWindow('month');
    expect(month.dayCount).toBe(30);
    expect(month.label).toContain('30');
  });

  it('computes saved and made dollars', () => {
    const impact = buildOptimizationImpact({
      inventory,
      forecasts,
      events,
      period: 'month',
      dayCount: 30,
      provenance: 'statistical',
    });
    expect(impact.dollarsSaved).toBeGreaterThan(0);
    expect(impact.dollarsMade).toBeGreaterThan(0);
    expect(impact.recommendations.length).toBeGreaterThan(0);
  });

  it('builds profit snapshot with category mix', () => {
    const snap = buildProfitSnapshot({
      period: 'month',
      inventory,
      salesByUpc: new Map(),
      forecasts,
      events,
      provenance: 'demo_proxy',
    });
    expect(snap.pulse.salesDollars).toBeGreaterThan(0);
    expect(snap.categoryMix.length).toBeGreaterThan(0);
    expect(snap.optimization.dollarsSaved).toBeGreaterThanOrEqual(0);
  });
});

describe('assistant grounded fallback', () => {
  it('answers Hay Days from context', () => {
    const snap = buildProfitSnapshot({
      period: 'month',
      inventory,
      salesByUpc: new Map(),
      forecasts,
      events,
      provenance: 'demo_proxy',
    });
    const res = groundedAssistantReply('What should I stock for Hay Days?', snap, [
      'Hay Days 2026-06-18→2026-06-20 ×1.5',
    ]);
    expect(res.reply.toLowerCase()).toMatch(/hay|ice|beer/);
    expect(res.citations.length).toBeGreaterThan(0);
  });

  it('marks empty sales history as proxy', () => {
    const snap = buildProfitSnapshot({
      period: 'month',
      inventory,
      salesByUpc: new Map([['1', []]]),
      forecasts,
      events,
      provenance: undefined,
    });
    expect(snap.isProxy).toBe(true);
  });

  it('does not inflate Square payments beyond lookback for year period', () => {
    const snap = buildProfitSnapshot({
      period: 'year',
      inventory,
      salesByUpc: new Map(),
      forecasts,
      events,
      squarePaymentsGrossCents: 900_000, // $9000 over 90d
    });
    expect(snap.pulse.salesDollars).toBe(9000);
    expect(snap.isProxy).toBe(false);
  });
});
