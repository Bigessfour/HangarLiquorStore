import type {
  InventoryRecord,
  ItemForecast,
  LocalEvent,
  SalesRecord,
} from '../../../shared/types/forecast';
import type {
  CategoryMixSlice,
  OptimizationImpact,
  OptimizationRecommendation,
  ProfitOpsSnapshot,
  ProfitPeriod,
  ProfitProvenance,
} from '../../../shared/types/profit';

const AVG_PRICE: Record<string, number> = {
  Beer: 12,
  Spirits: 22,
  Wine: 15,
  Mixers: 8,
  RTD: 10,
  Ice: 6,
  General: 14,
};

const AVG_COST_RATIO = 0.72; // ~28% margin → cost is 72% of price

function avgPrice(category: string, name: string): number {
  const n = name.toLowerCase();
  if (n.includes('ice') || category === 'Ice') return AVG_PRICE.Ice;
  if (n.includes('rtd') || n.includes('seltzer') || n.includes('hard tea')) return AVG_PRICE.RTD;
  return AVG_PRICE[category] ?? AVG_PRICE.General;
}

function mixCategory(category: string, name: string): string {
  const n = name.toLowerCase();
  if (n.includes('ice')) return 'Mixers/Ice';
  if (n.includes('rtd') || n.includes('seltzer') || n.includes('hard tea')) return 'RTD';
  if (category === 'Mixers') return 'Mixers/Ice';
  if (category === 'Beer' || category === 'Wine' || category === 'Spirits') return category;
  return category || 'Other';
}

export function periodWindow(
  period: ProfitPeriod,
  today = new Date(),
): {
  start: string;
  end: string;
  label: string;
  dayCount: number;
} {
  const end = today.toISOString().slice(0, 10);
  const startDate = new Date(today);
  if (period === 'day') {
    return { start: end, end, label: 'Today', dayCount: 1 };
  }
  if (period === 'month') {
    startDate.setUTCDate(startDate.getUTCDate() - 29);
    return {
      start: startDate.toISOString().slice(0, 10),
      end,
      label: 'Last 30 days',
      dayCount: 30,
    };
  }
  startDate.setUTCDate(startDate.getUTCDate() - 364);
  return {
    start: startDate.toISOString().slice(0, 10),
    end,
    label: 'Last 12 months',
    dayCount: 365,
  };
}

function salesInWindow(
  salesByUpc: Map<string, SalesRecord[]>,
  start: string,
  end: string,
): Map<string, number> {
  const units = new Map<string, number>();
  for (const [upc, rows] of salesByUpc) {
    let sum = 0;
    for (const row of rows) {
      if (row.date >= start && row.date <= end) sum += row.quantity;
    }
    if (sum > 0) units.set(upc, sum);
  }
  return units;
}

export function buildOptimizationImpact(input: {
  inventory: InventoryRecord[];
  forecasts: ItemForecast[];
  events: LocalEvent[];
  period: ProfitPeriod;
  dayCount: number;
  provenance?: ProfitProvenance;
}): OptimizationImpact {
  const recommendations: OptimizationRecommendation[] = [];
  let dollarsSaved = 0;
  let dollarsMade = 0;

  for (const forecast of input.forecasts) {
    const price = avgPrice(forecast.category, forecast.name);
    const cost = price * AVG_COST_RATIO;
    const naiveOrder = Math.max(
      0,
      Math.ceil(forecast.predictedDemand14d * 2 - forecast.currentStock),
    );
    const smartOrder = Math.max(0, forecast.suggestedOrder);
    const avoidedOverbuy = Math.max(0, naiveOrder - smartOrder);
    const saved = avoidedOverbuy * cost * (input.dayCount / 14);
    dollarsSaved += saved;

    const stockoutRisk = Math.max(0, forecast.predictedDemand14d - forecast.currentStock);
    const made = stockoutRisk * price * 0.28 * (input.dayCount / 14);
    dollarsMade += made;

    if (smartOrder > 0 && recommendations.length < 6) {
      recommendations.push({
        upc: forecast.upc,
        name: forecast.name,
        action: 'order',
        dollarsImpact: Math.round(made + saved),
        reason: `Order ~${smartOrder} (smart) vs naive ~${naiveOrder} — protects margin & shelf`,
      });
    } else if (avoidedOverbuy > 2 && recommendations.length < 6) {
      recommendations.push({
        upc: forecast.upc,
        name: forecast.name,
        action: 'hold',
        dollarsImpact: Math.round(saved),
        reason: `Hold back ~${Math.round(avoidedOverbuy)} units vs overbuying`,
      });
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const activeEvents = input.events.filter((e) => e.startDate <= today && e.endDate >= today);
  if (activeEvents.length > 0) {
    const uplift = Math.max(...activeEvents.map((e) => e.multiplier)) - 1;
    const eventMade = dollarsMade * uplift * 0.35;
    dollarsMade += eventMade;
    recommendations.unshift({
      upc: 'event',
      name: activeEvents[0].name,
      action: 'promote',
      dollarsImpact: Math.round(eventMade),
      reason: `Active event ×${activeEvents[0].multiplier} — keep ice & beer ready`,
    });
  }

  const confidence: OptimizationImpact['confidence'] =
    input.forecasts.length >= 8 ? 'high' : input.forecasts.length >= 3 ? 'medium' : 'low';

  const provenance = input.provenance ?? 'statistical';

  return {
    dollarsSaved: Math.round(dollarsSaved),
    dollarsMade: Math.round(dollarsMade),
    confidence,
    provenance,
    explanation:
      provenance === 'demo_proxy'
        ? 'Demo estimate from forecast reorder vs naive overbuy and stockout avoidance.'
        : 'Cash staying in Hangar’s pocket from smarter reorders and fewer stockouts.',
    recommendations: recommendations.slice(0, 5),
  };
}

export function buildProfitSnapshot(input: {
  period: ProfitPeriod;
  inventory: InventoryRecord[];
  salesByUpc: Map<string, SalesRecord[]>;
  forecasts: ItemForecast[];
  events: LocalEvent[];
  squarePaymentsGrossCents?: number | null;
  squareLastSyncAt?: string | null;
  provenance?: ProfitProvenance;
}): ProfitOpsSnapshot {
  const window = periodWindow(input.period);
  const unitsByUpc = salesInWindow(input.salesByUpc, window.start, window.end);

  let unitsSold = 0;
  let salesDollars = 0;
  const mixMap = new Map<string, { dollars: number; units: number }>();

  for (const item of input.inventory) {
    let units = unitsByUpc.get(item.upc) ?? 0;
    // Proxy: scale predicted demand when no sales history
    if (units === 0) {
      const forecast = input.forecasts.find((f) => f.upc === item.upc);
      if (forecast) {
        units = Math.round((forecast.predictedDemand14d / 14) * window.dayCount);
      }
    }
    const price = avgPrice(item.category, item.name);
    const dollars = units * price;
    unitsSold += units;
    salesDollars += dollars;
    const cat = mixCategory(item.category, item.name);
    const prev = mixMap.get(cat) ?? { dollars: 0, units: 0 };
    mixMap.set(cat, { dollars: prev.dollars + dollars, units: prev.units + units });
  }

  const historyUnits = [...unitsByUpc.values()].reduce((sum, qty) => sum + qty, 0);
  let isProxy = historyUnits === 0;
  let provenance: ProfitProvenance = input.provenance ?? (isProxy ? 'demo_proxy' : 'statistical');

  const SQUARE_LOOKBACK_DAYS = 90;
  if (input.squarePaymentsGrossCents && input.squarePaymentsGrossCents > 0) {
    // Prefer Square payment rollup for pulse sales — scale down for shorter periods,
    // but never inflate beyond the synced lookback window (no year extrapolation).
    const squareDollars = input.squarePaymentsGrossCents / 100;
    const scale = Math.min(1, window.dayCount / SQUARE_LOOKBACK_DAYS);
    salesDollars = squareDollars * scale;
    isProxy = false;
    provenance = provenance === 'sagemaker' ? 'hybrid' : 'square_sync';
  }

  const categoryMix: CategoryMixSlice[] = [...mixMap.entries()]
    .map(([category, v]) => ({
      category,
      salesDollars: Math.round(v.dollars),
      units: v.units,
      sharePct: salesDollars > 0 ? Math.round((v.dollars / salesDollars) * 100) : 0,
    }))
    .sort((a, b) => b.salesDollars - a.salesDollars);

  // Recompute share against final salesDollars if Square overrode
  if (input.squarePaymentsGrossCents && salesDollars > 0 && categoryMix.length > 0) {
    const mixTotal = categoryMix.reduce((s, c) => s + c.salesDollars, 0) || 1;
    for (const slice of categoryMix) {
      slice.sharePct = Math.round((slice.salesDollars / mixTotal) * 100);
      slice.salesDollars = Math.round((slice.sharePct / 100) * salesDollars);
    }
  }

  const lowStockItems = input.inventory
    .filter((i) => (i.reorderPoint ?? 0) > 0 && i.currentStock <= (i.reorderPoint ?? 0))
    .map((i) => ({
      upc: i.upc,
      name: i.name,
      currentStock: i.currentStock,
      reorderPoint: i.reorderPoint ?? 0,
    }))
    .slice(0, 8);

  const totalStock = input.inventory.reduce((s, i) => s + i.currentStock, 0);
  const avgDaily = Math.max(unitsSold / window.dayCount, 0.1);
  const daysOfSupply = Math.round(totalStock / avgDaily);
  const turnsPerYear = daysOfSupply > 0 ? Math.round((365 / daysOfSupply) * 10) / 10 : null;

  const optimization = buildOptimizationImpact({
    inventory: input.inventory,
    forecasts: input.forecasts,
    events: input.events,
    period: input.period,
    dayCount: window.dayCount,
    provenance,
  });

  return {
    period: input.period,
    periodLabel: window.label,
    generatedAt: new Date().toISOString(),
    isProxy,
    pulse: {
      salesDollars: Math.round(salesDollars),
      marginPct: 28,
      lowStockCount: lowStockItems.length,
      daysOfSupply,
      unitsSold,
      avgBasketDollars:
        unitsSold > 0 ? Math.round((salesDollars / Math.max(unitsSold / 3, 1)) * 10) / 10 : null,
    },
    categoryMix,
    health: {
      lowStockItems,
      turnsPerYear,
    },
    optimization,
    squareConnected: !!input.squareLastSyncAt || !!input.squarePaymentsGrossCents,
    squareLastSyncAt: input.squareLastSyncAt ?? null,
  };
}
