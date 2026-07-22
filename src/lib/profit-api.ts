import { apiClient } from '@/lib/api-client';
import { isMockApi } from '@/lib/mock-api';
import type {
  AssistantChatResponse,
  OptimizationImpact,
  ProfitOpsSnapshot,
  ProfitPeriod,
} from '@/types/profit';

const MOCK_SNAPSHOT: ProfitOpsSnapshot = {
  period: 'month',
  periodLabel: 'Last 30 days',
  generatedAt: new Date().toISOString(),
  isProxy: true,
  pulse: {
    salesDollars: 18420,
    marginPct: 28,
    lowStockCount: 3,
    daysOfSupply: 22,
    unitsSold: 1420,
    avgBasketDollars: 38.5,
  },
  categoryMix: [
    { category: 'Beer', salesDollars: 7200, units: 600, sharePct: 39 },
    { category: 'Spirits', salesDollars: 6100, units: 280, sharePct: 33 },
    { category: 'Wine', salesDollars: 2900, units: 190, sharePct: 16 },
    { category: 'Mixers/Ice', salesDollars: 1400, units: 220, sharePct: 8 },
    { category: 'RTD', salesDollars: 820, units: 130, sharePct: 4 },
  ],
  health: {
    lowStockItems: [
      {
        upc: '018200000103',
        name: 'Bud Light 12pk 12oz Cans',
        currentStock: 5,
        reorderPoint: 24,
      },
      {
        upc: '082184000012',
        name: "Jack Daniel's Tennessee Whiskey 750ml",
        currentStock: 3,
        reorderPoint: 12,
      },
    ],
    turnsPerYear: 16.6,
  },
  optimization: {
    dollarsSaved: 1840,
    dollarsMade: 2100,
    confidence: 'medium',
    provenance: 'demo_proxy',
    explanation:
      'Demo cash-impact estimate from days-of-cover vs category targets (overstock saved / stockout margin protected).',
    recommendations: [
      {
        upc: '082184000012',
        name: "Jack Daniel's Tennessee Whiskey 750ml",
        action: 'promote',
        dollarsImpact: 412,
        reason: '0 sales in 67d — $412 cash currently tied up; promote or clear.',
        daysOfCover: 67,
        excessUnits: 8,
        cashTiedUp: 412,
        limitedHistory: false,
      },
      {
        upc: '018200000103',
        name: 'Bud Light 12pk',
        action: 'order',
        dollarsImpact: 320,
        reason: 'Order ~20 to hit 10d cover — protects ~$320 margin at risk.',
        daysOfCover: 3,
        cashTiedUp: 0,
      },
      {
        upc: 'event',
        name: 'Hay Days readiness',
        action: 'promote',
        dollarsImpact: 0,
        reason: 'Active event ×1.5 — demand uplift already applied in cover math (ice & beer focus).',
      },
    ],
  },
  squareConnected: false,
  squareLastSyncAt: null,
};

function withPeriod(base: ProfitOpsSnapshot, period: ProfitPeriod): ProfitOpsSnapshot {
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
      dollarsSaved: Math.round(base.optimization.dollarsSaved * scale),
      dollarsMade: Math.round(base.optimization.dollarsMade * scale),
    },
    categoryMix: base.categoryMix.map((c) => ({
      ...c,
      salesDollars: Math.round(c.salesDollars * scale),
      units: Math.round(c.units * scale),
    })),
  };
}

export async function fetchProfitOps(period: ProfitPeriod): Promise<ProfitOpsSnapshot> {
  if (isMockApi()) {
    return withPeriod(MOCK_SNAPSHOT, period);
  }
  return apiClient<ProfitOpsSnapshot>(`/api/profit?period=${period}`);
}

export async function fetchOptimization(period: ProfitPeriod): Promise<OptimizationImpact> {
  if (isMockApi()) {
    return withPeriod(MOCK_SNAPSHOT, period).optimization;
  }
  return apiClient<OptimizationImpact>(`/api/optimize?period=${period}`);
}

export async function askHangarAssistant(
  message: string,
  period: ProfitPeriod,
): Promise<AssistantChatResponse> {
  if (isMockApi()) {
    const snap = withPeriod(MOCK_SNAPSHOT, period);
    const q = message.toLowerCase();
    if (q.includes('overstock') || q.includes('cash tied') || q.includes('tied up') || q.includes('whiskey')) {
      const overstock = [...snap.optimization.recommendations]
        .filter((r) => r.upc !== 'event' && (r.cashTiedUp ?? 0) > 0)
        .sort((a, b) => (b.cashTiedUp ?? 0) - (a.cashTiedUp ?? 0))[0];
      if (overstock) {
        return {
          reply: `Biggest overstock this ${snap.periodLabel}: ${overstock.name} — about $${overstock.cashTiedUp ?? overstock.dollarsImpact} cash tied up${overstock.daysOfCover != null ? ` (~${overstock.daysOfCover}d cover)` : ''}. ${overstock.reason}`,
          citations: [
            `Cash tied up $${overstock.cashTiedUp ?? overstock.dollarsImpact}`,
            overstock.reason,
          ],
          source: 'demo',
        };
      }
    }
    if (q.includes('hay')) {
      return {
        reply: `For Hay Days, prioritize Ice and Beer/RTD. This ${snap.periodLabel} optimization shows about $${snap.optimization.dollarsMade} made from being event-ready (demo estimate).`,
        citations: [`Made $${snap.optimization.dollarsMade}`, 'Focus: Ice | Beer/RTD'],
        source: 'demo',
      };
    }
    if (q.includes('beer')) {
      return {
        reply: `Beer is ~${snap.categoryMix[0]?.sharePct}% of mix (~$${snap.categoryMix[0]?.salesDollars}). Days of supply ~${snap.pulse.daysOfSupply}. Saved ~$${snap.optimization.dollarsSaved} from cover targets.`,
        citations: [`Beer $${snap.categoryMix[0]?.salesDollars}`, `DOS ${snap.pulse.daysOfSupply}`],
        source: 'demo',
      };
    }
    return {
      reply: `${snap.periodLabel}: ~$${snap.pulse.salesDollars} sales, $${snap.optimization.dollarsSaved} saved / $${snap.optimization.dollarsMade} made. Ask about Hay Days, beer cash, or what to order.`,
      citations: [
        `Sales $${snap.pulse.salesDollars}`,
        `Saved $${snap.optimization.dollarsSaved}`,
        `Made $${snap.optimization.dollarsMade}`,
      ],
      source: 'demo',
    };
  }
  return apiClient<AssistantChatResponse>('/api/assistant/chat', {
    method: 'POST',
    body: JSON.stringify({ message, period }),
  });
}
