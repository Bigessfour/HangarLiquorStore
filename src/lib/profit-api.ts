import { apiClient } from '@/lib/api-client';
import { isDemoProfitSimulated, isDemoSquareSimulated } from '@/lib/demo-sim';
import {
  buildForecastLearningStatus,
  demoSimulatedSalesSince,
} from '@/lib/forecast-learning';
import { isMockApi } from '@/lib/mock-api';
import { applyProfitPeriod } from '@/lib/profit-period';
import type {
  AssistantChatResponse,
  AssistantChatTurn,
  AssistantDeepLink,
  OptimizationImpact,
  ProfitOpsSnapshot,
  ProfitPeriod,
} from '@/types/profit';

/**
 * Demo sample numbers (not live register $). Period scaling via applyProfitPeriod
 * matches cash-impact-engine: Saved fixed, Made scales with window.
 */
const MOCK_SNAPSHOT_BASE: Omit<
  ProfitOpsSnapshot,
  | 'period'
  | 'periodLabel'
  | 'generatedAt'
  | 'isProxy'
  | 'optimization'
  | 'squareConnected'
  | 'squareLastSyncAt'
  | 'learning'
> & {
  optimization: Omit<OptimizationImpact, 'provenance' | 'explanation'>;
} = {
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
        daysOfCover: 3,
      },
      {
        upc: '082184000012',
        name: "Jack Daniel's Tennessee Whiskey 750ml",
        currentStock: 3,
        reorderPoint: 12,
        daysOfCover: 67,
      },
    ],
    turnsPerYear: 16.6,
    fastMovers: [
      {
        upc: '018200000103',
        name: 'Bud Light 12pk',
        unitsPerDay: 1.6,
        daysOfCover: 3,
        action: 'order',
      },
    ],
    slowMovers: [
      {
        upc: '082184000012',
        name: "Jack Daniel's Tennessee Whiskey 750ml",
        unitsPerDay: 0.1,
        daysOfCover: 67,
        cashTiedUp: 412,
        action: 'promote',
      },
    ],
    velocitySummary: {
      avgDaysOfCover: 22,
      itemsUnder7d: 1,
      itemsOver45d: 1,
    },
  },
  activeEvents: [
    {
      name: 'Hay Days',
      multiplier: 1.5,
      startDate: '2026-06-18',
      endDate: '2099-12-31',
    },
  ],
  optimization: {
    dollarsSaved: 1840,
    dollarsMade: 2100,
    confidence: 'medium',
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
};

function buildMockSnapshot(): ProfitOpsSnapshot {
  const simulate = isDemoProfitSimulated();
  const lastSync =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('hanger-demo-square-last-sync')
      : null;
  const salesDataSince = simulate ? demoSimulatedSalesSince() : null;

  return {
    period: 'month',
    periodLabel: 'Last 30 days',
    generatedAt: new Date().toISOString(),
    // Still sample $ — banner + isProxy keep us honest even when "connected" sim is on
    isProxy: true,
    pulse: MOCK_SNAPSHOT_BASE.pulse,
    categoryMix: MOCK_SNAPSHOT_BASE.categoryMix,
    health: MOCK_SNAPSHOT_BASE.health,
    activeEvents: MOCK_SNAPSHOT_BASE.activeEvents,
    optimization: {
      ...MOCK_SNAPSHOT_BASE.optimization,
      provenance: simulate ? 'square_sync' : 'demo_proxy',
      explanation: simulate
        ? 'Simulated Square-connected cash-impact view (sample sales + cover math). Real live dollars need Owner Square Connect + sync.'
        : 'Demo cash-impact estimate from days-of-cover vs category targets. Connect Square and sync for live register dollars.',
    },
    squareConnected: simulate && isDemoSquareSimulated(),
    squareLastSyncAt: simulate
      ? (lastSync ?? new Date(Date.now() - 3_600_000).toISOString())
      : null,
    learning: buildForecastLearningStatus({
      basis: simulate ? 'demo_simulation' : 'inventory_proxy',
      salesDataSince,
      holidaysWithActuals: simulate ? 1 : 0,
      pastHolidaysOnCalendar: simulate ? 2 : 0,
    }),
  };
}

function withPeriod(base: ProfitOpsSnapshot, period: ProfitPeriod): ProfitOpsSnapshot {
  return applyProfitPeriod(base, period);
}

export async function fetchProfitOps(period: ProfitPeriod): Promise<ProfitOpsSnapshot> {
  if (isMockApi()) {
    return withPeriod(buildMockSnapshot(), period);
  }
  return apiClient<ProfitOpsSnapshot>(`/api/profit?period=${period}`);
}

export async function fetchOptimization(period: ProfitPeriod): Promise<OptimizationImpact> {
  if (isMockApi()) {
    return withPeriod(buildMockSnapshot(), period).optimization;
  }
  return apiClient<OptimizationImpact>(`/api/optimize?period=${period}`);
}

export async function askHangarAssistant(
  message: string,
  period: ProfitPeriod,
  history: AssistantChatTurn[] = [],
): Promise<AssistantChatResponse> {
  if (isMockApi()) {
    const snap = withPeriod(buildMockSnapshot(), period);
    const q = message.toLowerCase();
    const recent = history.slice(-4);

    if (
      q.includes('how do i') ||
      q.includes('how to') ||
      q.includes('where is') ||
      q.includes('offline') ||
      q.includes('scan') && (q.includes('how') || q.includes('open') || q.includes('camera'))
    ) {
      const deepLinks: AssistantDeepLink[] = [{ type: 'route', label: 'Open Scan', path: '/scan' }];
      return {
        reply:
          'Tap the floating Scan button (or Scan in the bottom nav). Point at the UPC, or take a photo / type the UPC on a laptop. Offline scans queue and sync when you are back online.',
        citations: ['Hangar PWA features'],
        source: 'demo',
        deepLinks,
      };
    }

    const followUp = q.includes('what about') || q.includes('how about') || q.includes('that whiskey') || q.includes('the whiskey');
    if (followUp || (q.includes('whiskey') && recent.some((t) => /jack|whiskey|overstock|tied/i.test(t.content)))) {
      const overstock = [...snap.optimization.recommendations]
        .filter((r) => r.upc !== 'event' && /jack|whiskey/i.test(r.name))
        .sort((a, b) => (b.cashTiedUp ?? 0) - (a.cashTiedUp ?? 0))[0];
      if (overstock) {
        return {
          reply: `${overstock.name}: ~$${overstock.cashTiedUp ?? overstock.dollarsImpact} cash tied up (~${overstock.daysOfCover ?? '?'}d cover). ${overstock.reason}`,
          citations: [`Cash tied up $${overstock.cashTiedUp ?? overstock.dollarsImpact}`],
          source: 'demo',
          deepLinks: [
            { type: 'sku', label: overstock.name, upc: overstock.upc },
            { type: 'route', label: 'Open Suggestions', path: '/suggestions' },
          ],
        };
      }
    }

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
          deepLinks: [
            { type: 'sku', label: overstock.name, upc: overstock.upc },
            { type: 'route', label: 'Open Profit', path: '/profit' },
          ],
        };
      }
    }
    if (
      q.includes('hay') ||
      q.includes('holiday') ||
      q.includes('christmas') ||
      q.includes('thanksgiving') ||
      q.includes('new year') ||
      q.includes('stock for')
    ) {
      return {
        reply: `For the next high-demand holiday, stock focused categories early (beer/ice for summer; spirits for Thanksgiving–NYE). Local events (Hay Days, hunting) pick up area demand via focus tags. This ${snap.periodLabel} shows about $${snap.optimization.dollarsMade} made from being event-ready (demo estimate). See Suggestions → Holiday stocking.`,
        citations: [`Made $${snap.optimization.dollarsMade}`, 'Holiday stocking + local events'],
        source: 'demo',
        deepLinks: [
          { type: 'route', label: 'Open Suggestions', path: '/suggestions' },
          { type: 'route', label: 'Open Events', path: '/events' },
        ],
      };
    }
    if (
      q.includes('improv') ||
      q.includes('accuracy') ||
      q.includes('history') ||
      q.includes('learning') ||
      (q.includes('square') && q.includes('data'))
    ) {
      return {
        reply: snap.learning.plainEnglish,
        citations: [
          snap.learning.salesDataSince
            ? `Sales since ${snap.learning.salesDataSince}`
            : 'No Square history yet',
          `~${snap.learning.expectedImprovementPctPerMonth}% / month (illustrative)`,
        ],
        source: 'demo',
      };
    }
    if (q.includes('beer')) {
      const beer = snap.categoryMix.find((c) => c.category === 'Beer') ?? snap.categoryMix[0];
      const beerRecs = snap.optimization.recommendations
        .filter((r) => r.upc !== 'event')
        .slice(0, 2);
      return {
        reply: `Beer is ~${beer?.sharePct}% of mix (~$${beer?.salesDollars}). Days of supply ~${snap.pulse.daysOfSupply}. Saved ~$${snap.optimization.dollarsSaved} from cover targets.${
          beerRecs.length
            ? ` Moves: ${beerRecs.map((r) => `${r.action} ${r.name} (~$${r.dollarsImpact})`).join(' · ')}`
            : ''
        }`,
        citations: [
          `Beer $${beer?.salesDollars}`,
          `DOS ${snap.pulse.daysOfSupply}`,
          ...beerRecs.map((r) => `${r.action} ${r.name}: $${r.dollarsImpact}`),
        ],
        source: 'demo',
      };
    }
    if (q.includes('order') || q.includes('this week') || q.includes('buy') || q.includes('reorder')) {
      const orders = snap.optimization.recommendations
        .filter((r) => r.upc !== 'event' && r.action === 'order')
        .slice(0, 3);
      const lows = snap.health.lowStockItems.slice(0, 3);
      return {
        reply: [
          orders.length
            ? `Order this period: ${orders.map((r) => `${r.name} (~$${r.dollarsImpact}) — ${r.reason}`).join(' · ')}`
            : `You have ${snap.pulse.lowStockCount} low-stock SKUs.`,
          lows.length
            ? `Low stock: ${lows.map((l) => `${l.name} (${l.currentStock}/${l.reorderPoint})`).join(', ')}.`
            : null,
          `Totals: $${snap.optimization.dollarsSaved} saved / $${snap.optimization.dollarsMade} made.`,
        ]
          .filter(Boolean)
          .join(' '),
        citations: [
          ...orders.map((r) => `${r.action} ${r.name}: $${r.dollarsImpact}`),
          ...lows.map((l) => `Low stock: ${l.name} (${l.currentStock})`),
        ],
        source: 'demo',
        deepLinks: [{ type: 'route', label: 'Open Suggestions', path: '/suggestions' }],
      };
    }
    const topRecs = snap.optimization.recommendations.filter((r) => r.upc !== 'event').slice(0, 3);
    const lows = snap.health.lowStockItems.slice(0, 2);
    return {
      reply: [
        `Using inventory + forecast estimates (demo). ${snap.periodLabel}: ~$${snap.pulse.salesDollars} sales, $${snap.optimization.dollarsSaved} saved / $${snap.optimization.dollarsMade} made${
          isDemoProfitSimulated()
            ? ' (demo simulation of a Square-connected view — not live register data yet)'
            : ''
        }, ~${snap.pulse.daysOfSupply}d supply.`,
        topRecs.length
          ? `Top moves: ${topRecs.map((r) => `${r.action} ${r.name} (~$${r.dollarsImpact})`).join(' · ')}`
          : null,
        lows.length
          ? `Low stock: ${lows.map((l) => `${l.name} (${l.currentStock})`).join(', ')}.`
          : null,
        'Try asking: what to order this week, biggest overstock, beer cash, the next holiday, or how to scan.',
      ]
        .filter(Boolean)
        .join(' '),
      citations: [
        `Sales $${snap.pulse.salesDollars}`,
        `Saved $${snap.optimization.dollarsSaved}`,
        `Made $${snap.optimization.dollarsMade}`,
        ...topRecs.map((r) => `${r.action} ${r.name}: $${r.dollarsImpact}`),
      ],
      source: 'demo',
      deepLinks: [
        { type: 'route', label: 'Open Suggestions', path: '/suggestions' },
        { type: 'route', label: 'Open Profit', path: '/profit' },
      ],
    };
  }
  return apiClient<AssistantChatResponse>('/api/assistant/chat', {
    method: 'POST',
    body: JSON.stringify({ message, period, history: history.slice(-4) }),
  });
}
