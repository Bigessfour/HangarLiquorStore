import type {
  InventoryRecord,
  ItemForecast,
  LocalEvent,
  SalesRecord,
} from '../../../shared/types/forecast';
import type {
  CategoryMixSlice,
  OptimizationImpact,
  ProfitOpsSnapshot,
  ProfitPeriod,
  ProfitProvenance,
} from '../../../shared/types/profit';
import { buildCashOptimizationImpact, unitPrice } from './cash-impact-engine';

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
  salesByUpc?: Map<string, SalesRecord[]>;
}): OptimizationImpact {
  return buildCashOptimizationImpact({
    inventory: input.inventory,
    forecasts: input.forecasts,
    salesByUpc: input.salesByUpc,
    events: input.events,
    period: input.period,
    dayCount: input.dayCount,
    provenance: input.provenance,
  });
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
    if (units === 0) {
      const forecast = input.forecasts.find((f) => f.upc === item.upc);
      if (forecast) {
        units = Math.round((forecast.predictedDemand14d / 14) * window.dayCount);
      }
    }
    const price = unitPrice(item.category, item.name);
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
    salesByUpc: input.salesByUpc,
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
