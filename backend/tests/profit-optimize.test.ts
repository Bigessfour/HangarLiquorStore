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
    // Low-cover beer under Hay Days should protect margin; excess may be zero
    expect(impact.dollarsMade + impact.dollarsSaved).toBeGreaterThan(0);
    expect(impact.recommendations.length).toBeGreaterThan(0);
    expect(impact.provenance).toBe('statistical');
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
    expect(snap.learning.basis).toBe('inventory_proxy');
    expect(snap.learning.plainEnglish.length).toBeGreaterThan(20);
  });

  it('cites earliest Square sale date when history exists', () => {
    const snap = buildProfitSnapshot({
      period: 'month',
      inventory,
      salesByUpc: new Map([
        [
          '1',
          [
            { upc: '1', date: '2026-03-01', quantity: 4 },
            { upc: '1', date: '2026-04-01', quantity: 2 },
          ],
        ],
      ]),
      forecasts,
      events,
      squareLastSyncAt: '2026-07-01T00:00:00Z',
    });
    expect(snap.learning.salesDataSince).toBe('2026-03-01');
    expect(snap.learning.basis).toBe('square_sales');
    expect(snap.learning.plainEnglish).toMatch(/actual Square sales since/);
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

  it('unknown question returns multi-SKU store briefing', () => {
    const snap = buildProfitSnapshot({
      period: 'month',
      inventory,
      salesByUpc: new Map(),
      forecasts,
      events,
      provenance: 'demo_proxy',
    });
    const res = groundedAssistantReply('Tell me something random about the store', snap, [
      'Hay Days 2026-06-18→2026-06-20 ×1.5',
    ]);
    expect(res.source).toBe('grounded_fallback');
    expect(res.reply).toMatch(/saved|made|sales/i);
    expect(res.reply.toLowerCase()).toMatch(/try asking/);
    const skuOrEventHits =
      (res.reply.match(/Coors|Tito|Hay Days|order|hold|low stock/gi) ?? []).length;
    expect(skuOrEventHits).toBeGreaterThanOrEqual(2);
    expect(res.citations.length).toBeGreaterThanOrEqual(2);
  });

  it('named SKU question cites that product', () => {
    const snap = buildProfitSnapshot({
      period: 'month',
      inventory,
      salesByUpc: new Map(),
      forecasts,
      events,
      provenance: 'demo_proxy',
    });
    const res = groundedAssistantReply('What about Coors Light?', snap, [
      'Hay Days 2026-06-18→2026-06-20 ×1.5',
    ]);
    expect(res.reply.toLowerCase()).toMatch(/coors/);
    expect(res.citations.some((c) => /coors/i.test(c))).toBe(true);
  });

  it('order-this-week intent lists order recommendations', () => {
    const snap = buildProfitSnapshot({
      period: 'month',
      inventory,
      salesByUpc: new Map(),
      forecasts,
      events,
      provenance: 'demo_proxy',
    });
    const res = groundedAssistantReply('What should I order this week?', snap, []);
    expect(res.reply.toLowerCase()).toMatch(/order|low stock|saved|made/);
    expect(res.citations.length).toBeGreaterThan(0);
  });

  it('how_to intent explains scan / offline from app knowledge', () => {
    const snap = buildProfitSnapshot({
      period: 'month',
      inventory,
      salesByUpc: new Map(),
      forecasts,
      events,
      provenance: 'demo_proxy',
    });
    const res = groundedAssistantReply('How do I scan a bottle offline?', snap, []);
    expect(res.reply.toLowerCase()).toMatch(/scan|offline|queue/);
    expect(res.deepLinks?.some((d) => d.path === '/scan')).toBe(true);
  });

  it('follow-up uses last mentioned SKU from history', () => {
    const snap = buildProfitSnapshot({
      period: 'month',
      inventory,
      salesByUpc: new Map(),
      forecasts,
      events,
      provenance: 'demo_proxy',
    });
    const res = groundedAssistantReply('what about that one?', snap, [], [
      { role: 'user', content: 'Tell me about Coors Light' },
      {
        role: 'assistant',
        content: 'order Coors Light 12pk (~$100, ~3d cover) — low stock',
      },
    ]);
    expect(res.reply.toLowerCase()).toMatch(/coors/);
  });

  it('snapshot includes fast/slow movers and active events', () => {
    const snap = buildProfitSnapshot({
      period: 'month',
      inventory,
      salesByUpc: new Map(),
      forecasts,
      events,
      provenance: 'demo_proxy',
    });
    expect(snap.health.fastMovers).toBeDefined();
    expect(snap.health.slowMovers).toBeDefined();
    expect(snap.health.velocitySummary.itemsUnder7d).toBeGreaterThanOrEqual(0);
    expect(snap.activeEvents.length).toBeGreaterThan(0);
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
