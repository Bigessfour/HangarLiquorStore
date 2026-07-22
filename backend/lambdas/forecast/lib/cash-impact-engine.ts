/**
 * Cash-Impact Inventory Engine — pure TypeScript math (no AWS).
 *
 * Answers: how much cash is trapped in wrong bottles, and the highest-ROI
 * action (order / hold / promote) with dollar impact + confidence.
 */
import type {
  InventoryRecord,
  ItemForecast,
  LocalEvent,
  SalesRecord,
} from '../../../shared/types/forecast';
import type {
  OptimizationImpact,
  OptimizationRecommendation,
  ProfitPeriod,
  ProfitProvenance,
} from '../../../shared/types/profit';

const MARGIN_RATIO = 0.28;
const COST_RATIO = 1 - MARGIN_RATIO; // 0.72

const AVG_PRICE: Record<string, number> = {
  Beer: 12,
  Spirits: 22,
  Wine: 15,
  Mixers: 8,
  RTD: 10,
  Ice: 6,
  General: 14,
};

/** Category cover policy: target_cover = lead_time + safety_days */
export interface CoverPolicy {
  safetyDays: number;
  leadTimeDays: number;
}

export const COVER_POLICIES: Record<string, CoverPolicy> = {
  Beer: { safetyDays: 6, leadTimeDays: 4 },
  RTD: { safetyDays: 6, leadTimeDays: 4 },
  Wine: { safetyDays: 14, leadTimeDays: 8 },
  PremiumSpirits: { safetyDays: 37, leadTimeDays: 14 },
  ValueSpirits: { safetyDays: 17, leadTimeDays: 10 },
  Mixers: { safetyDays: 7, leadTimeDays: 4 },
  Ice: { safetyDays: 7, leadTimeDays: 4 },
  General: { safetyDays: 14, leadTimeDays: 7 },
};

export interface SkuCashImpact {
  upc: string;
  name: string;
  category: string;
  avgDailyVelocity: number;
  daysOfCover: number;
  targetCover: number;
  excessUnits: number;
  overstockDollars: number;
  stockoutRiskDollars: number;
  cashTiedUp: number;
  limitedHistory: boolean;
  action: 'order' | 'hold' | 'promote' | 'run';
  dollarsImpact: number;
  reason: string;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function resolveCoverPolicy(category: string, name: string): CoverPolicy {
  const n = name.toLowerCase();
  if (n.includes('ice') || category === 'Ice') return COVER_POLICIES.Ice;
  if (n.includes('rtd') || n.includes('seltzer') || n.includes('hard tea') || category === 'RTD') {
    return COVER_POLICIES.RTD;
  }
  if (category === 'Beer') return COVER_POLICIES.Beer;
  if (category === 'Wine') return COVER_POLICIES.Wine;
  if (category === 'Mixers') return COVER_POLICIES.Mixers;
  if (category === 'Spirits') {
    // Premium heuristic: luxury / high price names or "reserve" / aged cues
    const premium =
      n.includes('reserve') ||
      n.includes('single malt') ||
      n.includes('cognac') ||
      n.includes("jack daniel") ||
      n.includes('crown royal') ||
      n.includes('patron') ||
      n.includes('grey goose') ||
      n.includes('macallan');
    return premium ? COVER_POLICIES.PremiumSpirits : COVER_POLICIES.ValueSpirits;
  }
  return COVER_POLICIES.General;
}

export function unitPrice(category: string, name: string): number {
  const n = name.toLowerCase();
  if (n.includes('ice') || category === 'Ice') return AVG_PRICE.Ice;
  if (n.includes('rtd') || n.includes('seltzer') || n.includes('hard tea')) return AVG_PRICE.RTD;
  return AVG_PRICE[category] ?? AVG_PRICE.General;
}

export function unitCost(category: string, name: string): number {
  return unitPrice(category, name) * COST_RATIO;
}

function activeEventMultiplier(events: LocalEvent[], todayStr: string): number {
  let max = 1;
  for (const e of events) {
    if (e.startDate <= todayStr && e.endDate >= todayStr) {
      max = Math.max(max, e.multiplier);
    }
  }
  return max;
}

function categoryAvgDaily(
  inventory: InventoryRecord[],
  velocities: Map<string, number>,
  category: string,
): number {
  const peers = inventory.filter((i) => i.category === category);
  if (peers.length === 0) return 0.5;
  let sum = 0;
  let n = 0;
  for (const p of peers) {
    const v = velocities.get(p.upc);
    if (v !== undefined && v > 0) {
      sum += v;
      n += 1;
    }
  }
  return n > 0 ? sum / n : 0.5;
}

function forecastBandForSku(forecast: ItemForecast | undefined): {
  predicted: number;
  lower: number;
  upper: number;
} {
  if (!forecast) return { predicted: 0, lower: 0, upper: 0 };
  const future = forecast.chartData.filter((p) => p.actual === undefined && p.predicted > 0);
  if (future.length === 0) {
    return {
      predicted: forecast.predictedDemand14d,
      lower: Math.round(forecast.predictedDemand14d * 0.75),
      upper: Math.round(forecast.predictedDemand14d * 1.25),
    };
  }
  const predicted = future.reduce((s, p) => s + p.predicted, 0);
  const lower = future.reduce((s, p) => s + p.lower, 0);
  const upper = future.reduce((s, p) => s + p.upper, 0);
  return { predicted, lower, upper };
}

function daysAtZero(sales: SalesRecord[], start: string, end: string, windowDays: number): number {
  const byDate = new Set(sales.filter((r) => r.date >= start && r.date <= end && r.quantity > 0).map((r) => r.date));
  return Math.max(0, windowDays - byDate.size);
}

/**
 * Compute per-SKU cash impact using cover / excess / stockout-risk formulas.
 */
export function computeSkuCashImpacts(input: {
  inventory: InventoryRecord[];
  forecasts: ItemForecast[];
  salesByUpc: Map<string, SalesRecord[]>;
  events: LocalEvent[];
  dayCount: number;
  today?: Date;
  /** Velocity lookback days (sales window). Fixed 90d so period toggle does not rewrite cover math. */
  velocityDays?: number;
}): SkuCashImpact[] {
  const today = input.today ?? new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const velocityDays = input.velocityDays ?? 90;
  const velStart = new Date(today);
  velStart.setUTCDate(velStart.getUTCDate() - (velocityDays - 1));
  const velStartStr = velStart.toISOString().slice(0, 10);

  const eventMult = activeEventMultiplier(input.events, todayStr);
  const forecastByUpc = new Map(input.forecasts.map((f) => [f.upc, f]));

  // Raw velocities from sales (before event mult — events apply to demand side only)
  const rawVelocity = new Map<string, number>();
  for (const item of input.inventory) {
    const sales = input.salesByUpc.get(item.upc) ?? [];
    let units = 0;
    for (const row of sales) {
      if (row.date >= velStartStr && row.date <= todayStr) units += row.quantity;
    }
    if (units > 0) rawVelocity.set(item.upc, units / velocityDays);
  }

  const results: SkuCashImpact[] = [];

  for (const item of input.inventory) {
    const forecast = forecastByUpc.get(item.upc);
    const policy = resolveCoverPolicy(item.category, item.name);
    const targetCover = policy.leadTimeDays + policy.safetyDays;
    const price = unitPrice(item.category, item.name);
    const cost = unitCost(item.category, item.name);

    let limitedHistory = false;
    let avgDaily = rawVelocity.get(item.upc) ?? 0;

    const salesInWindow = (input.salesByUpc.get(item.upc) ?? []).filter(
      (r) => r.date >= velStartStr && r.date <= todayStr,
    );
    const soldInWindow = salesInWindow.reduce((s, r) => s + r.quantity, 0);

    // Zero sales in lookback: do NOT borrow category velocity (that invents demand and
    // mislabels dead stock as understock). Use a tiny floor so cover stays high.
    if (soldInWindow === 0 && item.currentStock > 0 && avgDaily <= 0) {
      avgDaily = 0.05;
      limitedHistory = true;
    } else if (avgDaily <= 0 && forecast && forecast.predictedDemand14d > 0) {
      avgDaily = forecast.predictedDemand14d / 14;
      limitedHistory = forecast.confidence === 'low';
    } else if (avgDaily <= 0) {
      avgDaily = categoryAvgDaily(input.inventory, rawVelocity, item.category);
      limitedHistory = true;
    }

    // Event uplift on demand side only (never invent volume elsewhere)
    const demandDaily = avgDaily * eventMult;
    const daysOfCover = item.currentStock / Math.max(demandDaily, 0.1);
    const excessUnits = Math.max(0, item.currentStock - targetCover * demandDaily);
    const overstockDollars = excessUnits * cost;

    // Stockout risk: P from forecast bands or historical miss rate
    const band = forecastBandForSku(forecast);
    const periodDemand = demandDaily * input.dayCount;
    let pStockout = 0;
    if (soldInWindow === 0 && item.currentStock > 0) {
      // Dead / no-sales SKUs are not stockout risks
      pStockout = 0;
    } else if (band.upper > band.lower && band.predicted > 0) {
      const scale = input.dayCount / 14;
      const pred = band.predicted * scale;
      const lower = band.lower * scale;
      const upper = band.upper * scale;
      pStockout = clamp((pred - item.currentStock) / Math.max(upper - lower, 1), 0, 1);
    } else {
      const sales = input.salesByUpc.get(item.upc) ?? [];
      const zeroDays = daysAtZero(sales, velStartStr, todayStr, velocityDays);
      pStockout = clamp(zeroDays / Math.max(velocityDays, 1), 0, 0.85);
      if (item.currentStock < periodDemand * 0.5) {
        pStockout = Math.max(pStockout, 0.4);
      }
    }

    const expectedLostUnits = pStockout * Math.max(0, periodDemand - item.currentStock);
    const stockoutRiskDollars = expectedLostUnits * price * MARGIN_RATIO;

    const isDeadStock = soldInWindow === 0 && item.currentStock > 0 && daysOfCover > targetCover * 1.5;

    let action: SkuCashImpact['action'] = 'run';
    let dollarsImpact = 0;
    let reason = `Cover ~${Math.round(daysOfCover)}d vs target ${targetCover}d — let it run.`;

    if (isDeadStock && overstockDollars >= 20) {
      action = 'promote';
      dollarsImpact = Math.round(overstockDollars);
      reason = limitedHistory
        ? `0 sales in ${velocityDays}d — $${Math.round(overstockDollars)} cash tied up (limited history — treating as category average).`
        : `0 sales in ${velocityDays}d — $${Math.round(overstockDollars)} cash currently tied up; promote or clear.`;
    } else if (excessUnits >= 2 && overstockDollars >= stockoutRiskDollars) {
      action = 'hold';
      dollarsImpact = Math.round(overstockDollars);
      reason = limitedHistory
        ? `Hold ~${Math.round(excessUnits)} excess units ($${Math.round(overstockDollars)} overstock) — limited history — treating as category average.`
        : `Hold ~${Math.round(excessUnits)} excess units — $${Math.round(overstockDollars)} cash trapped vs ${targetCover}d cover target.`;
    } else if (stockoutRiskDollars >= 15 || (pStockout > 0.35 && periodDemand > item.currentStock)) {
      action = 'order';
      const orderUnits = Math.max(0, Math.ceil(targetCover * demandDaily - item.currentStock));
      dollarsImpact = Math.round(stockoutRiskDollars);
      reason = limitedHistory
        ? `Order ~${orderUnits} to hit ${targetCover}d cover — protects ~$${Math.round(stockoutRiskDollars)} margin (limited history — treating as category average).`
        : `Order ~${orderUnits} to hit ${targetCover}d cover — protects ~$${Math.round(stockoutRiskDollars)} margin at risk.`;
    }

    results.push({
      upc: item.upc,
      name: item.name,
      category: item.category,
      avgDailyVelocity: Math.round(demandDaily * 100) / 100,
      daysOfCover: Math.round(daysOfCover * 10) / 10,
      targetCover,
      excessUnits: Math.round(excessUnits * 10) / 10,
      overstockDollars: Math.round(overstockDollars),
      stockoutRiskDollars: Math.round(stockoutRiskDollars),
      cashTiedUp: Math.round(overstockDollars),
      limitedHistory,
      action,
      dollarsImpact,
      reason,
    });
  }

  return results;
}

export function buildCashOptimizationImpact(input: {
  inventory: InventoryRecord[];
  forecasts: ItemForecast[];
  salesByUpc?: Map<string, SalesRecord[]>;
  events: LocalEvent[];
  period: ProfitPeriod;
  dayCount: number;
  provenance?: ProfitProvenance;
  today?: Date;
}): OptimizationImpact {
  const salesByUpc = input.salesByUpc ?? new Map();
  const skuImpacts = computeSkuCashImpacts({
    inventory: input.inventory,
    forecasts: input.forecasts,
    salesByUpc,
    events: input.events,
    dayCount: input.dayCount,
    today: input.today,
  });

  let dollarsSaved = 0;
  let dollarsMade = 0;
  let limitedCount = 0;

  for (const sku of skuImpacts) {
    dollarsSaved += sku.overstockDollars;
    dollarsMade += sku.stockoutRiskDollars;
    if (sku.limitedHistory) limitedCount += 1;
  }

  // Event multiplier already applied to demandDaily in SKU math — do not add a second
  // dollarsMade uplift. Optional narrative row only (zero $ so it cannot invent Made).
  const todayStr = (input.today ?? new Date()).toISOString().slice(0, 10);
  const activeEvents = input.events.filter((e) => e.startDate <= todayStr && e.endDate >= todayStr);
  const recommendations: OptimizationRecommendation[] = [];

  if (activeEvents.length > 0) {
    recommendations.push({
      upc: 'event',
      name: activeEvents[0].name,
      action: 'promote',
      dollarsImpact: 0,
      reason: `Active event ×${activeEvents[0].multiplier} — demand uplift already applied in cover math (ice & beer focus).`,
    });
  }

  const actionable = skuImpacts
    .filter((s) => s.action !== 'run' && s.dollarsImpact > 0)
    .sort((a, b) => Math.abs(b.dollarsImpact) - Math.abs(a.dollarsImpact))
    .slice(0, 7);

  for (const sku of actionable) {
    recommendations.push({
      upc: sku.upc,
      name: sku.name,
      action: sku.action === 'run' ? 'hold' : sku.action,
      dollarsImpact: sku.dollarsImpact,
      reason: sku.reason,
      daysOfCover: sku.daysOfCover,
      excessUnits: sku.excessUnits,
      cashTiedUp: sku.cashTiedUp,
      limitedHistory: sku.limitedHistory,
    });
  }

  recommendations.sort((a, b) => Math.abs(b.dollarsImpact) - Math.abs(a.dollarsImpact));
  const top = recommendations.slice(0, 7);

  const historyRich = skuImpacts.length > 0 && limitedCount / skuImpacts.length < 0.4;
  const confidence: OptimizationImpact['confidence'] = historyRich
    ? skuImpacts.length >= 8
      ? 'high'
      : 'medium'
    : limitedCount > skuImpacts.length * 0.6
      ? 'low'
      : 'medium';

  const provenance = input.provenance ?? 'statistical';
  const proxyNote =
    provenance === 'demo_proxy' || limitedCount > 0
      ? ' Some SKUs use category averages where history is thin.'
      : '';

  return {
    dollarsSaved: Math.round(dollarsSaved),
    dollarsMade: Math.round(dollarsMade),
    confidence,
    provenance,
    explanation:
      provenance === 'demo_proxy'
        ? `Demo cash-impact estimate from days-of-cover vs category targets (overstock saved / stockout margin protected).${proxyNote}`
        : `Cash staying in Hangar’s pocket: overstock avoided vs cover targets; margin protected from stockouts. Events boost demand only.${proxyNote}`,
    recommendations: top,
  };
}
