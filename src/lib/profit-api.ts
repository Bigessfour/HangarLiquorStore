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
    dollarsSaved: 840,
    dollarsMade: 1260,
    confidence: 'medium',
    provenance: 'demo_proxy',
    explanation: 'Demo estimate from forecast reorder vs naive overbuy and stockout avoidance.',
    recommendations: [
      {
        upc: '018200000103',
        name: 'Bud Light 12pk',
        action: 'order',
        dollarsImpact: 320,
        reason: 'Low stock vs weekend beer demand',
      },
      {
        upc: 'event',
        name: 'Local event readiness',
        action: 'promote',
        dollarsImpact: 180,
        reason: 'Ice & beer focus for festivals',
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
    if (q.includes('hay')) {
      return {
        reply: `For Hay Days, prioritize Ice and Beer/RTD. This ${snap.periodLabel} optimization shows about $${snap.optimization.dollarsMade} made from being event-ready (demo estimate).`,
        citations: [`Made $${snap.optimization.dollarsMade}`, 'Focus: Ice | Beer/RTD'],
        source: 'demo',
      };
    }
    if (q.includes('beer')) {
      return {
        reply: `Beer is ~${snap.categoryMix[0]?.sharePct}% of mix (~$${snap.categoryMix[0]?.salesDollars}). Days of supply ~${snap.pulse.daysOfSupply}.`,
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
