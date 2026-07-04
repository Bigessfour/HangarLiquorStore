import type {
  ForecastConfidence,
  ForecastPoint,
  InventoryRecord,
  ItemForecast,
  LocalEvent,
  SalesRecord,
} from '../../../shared/types/forecast';
import { getMultiplierForDate } from './event-multiplier';

const HISTORY_DAYS = 90;
const CHART_HISTORY_DAYS = 14;

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function parseDate(date: string): Date {
  return new Date(`${date}T12:00:00.000Z`);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function confidenceBand(confidence: ForecastConfidence): number {
  switch (confidence) {
    case 'high':
      return 0.15;
    case 'medium':
      return 0.25;
    default:
      return 0.4;
  }
}

function computeConfidence(historyDays: number): ForecastConfidence {
  if (historyDays >= 30) return 'high';
  if (historyDays >= 14) return 'medium';
  return 'low';
}

function weekdayAverages(records: SalesRecord[]): number[] {
  const buckets = Array.from({ length: 7 }, () => [] as number[]);

  for (const record of records) {
    const dow = parseDate(record.date).getUTCDay();
    buckets[dow].push(record.quantity);
  }

  const overallMean =
    records.length > 0
      ? records.reduce((sum, record) => sum + record.quantity, 0) / records.length
      : 0;

  return buckets.map((values) => {
    if (values.length < 2) return overallMean;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  });
}

function recentTrend(records: SalesRecord[], today: Date): number {
  const last7Start = formatDate(addDays(today, -7));
  const prior7Start = formatDate(addDays(today, -14));
  const prior7End = formatDate(addDays(today, -8));

  const last7 = records.filter((record) => record.date >= last7Start);
  const prior7 = records.filter(
    (record) => record.date >= prior7Start && record.date <= prior7End,
  );

  const lastAvg =
    last7.length > 0
      ? last7.reduce((sum, record) => sum + record.quantity, 0) / last7.length
      : 0;
  const priorAvg =
    prior7.length > 0
      ? prior7.reduce((sum, record) => sum + record.quantity, 0) / prior7.length
      : lastAvg;

  if (priorAvg <= 0) return 1;
  return clamp(lastAvg / priorAvg, 0.7, 1.5);
}

function peakWeekdayAverage(weekdayAvg: number[]): number {
  return Math.max(...weekdayAvg, 0);
}

export interface ForecastEngineInput {
  inventory: InventoryRecord;
  salesHistory: SalesRecord[];
  localEvents: LocalEvent[];
  horizon?: number;
  today?: Date;
}

export function buildItemForecast(input: ForecastEngineInput): ItemForecast {
  const {
    inventory,
    salesHistory,
    localEvents,
    horizon = 14,
    today = new Date(),
  } = input;

  const todayStr = formatDate(today);
  const historyStart = formatDate(addDays(today, -HISTORY_DAYS));
  const history = salesHistory.filter(
    (record) => record.date >= historyStart && record.date <= todayStr,
  );

  const uniqueHistoryDays = new Set(history.map((record) => record.date)).size;
  const confidence = computeConfidence(uniqueHistoryDays);
  const band = confidenceBand(confidence);
  const weekdayAvg = weekdayAverages(history);
  const trend = recentTrend(history, today);
  const safetyStock = Math.ceil(2 * peakWeekdayAverage(weekdayAvg));

  const chartData: ForecastPoint[] = [];
  let predictedDemand = 0;

  for (let offset = -CHART_HISTORY_DAYS; offset <= horizon; offset += 1) {
    const date = addDays(today, offset);
    const dateStr = formatDate(date);
    const dow = date.getUTCDay();
    const base = weekdayAvg[dow] * trend;
    const multiplier = getMultiplierForDate(dateStr, localEvents);
    const predicted = Math.max(0, Math.round(base * multiplier));
    const lower = Math.max(0, Math.round(predicted * (1 - band)));
    const upper = Math.round(predicted * (1 + band));

    const actualRecord = history.find((record) => record.date === dateStr);

    if (offset > 0) {
      predictedDemand += predicted;
    }

    chartData.push({
      date: dateStr,
      actual: offset <= 0 ? actualRecord?.quantity : undefined,
      predicted,
      lower,
      upper,
    });
  }

  const suggestedOrder = Math.max(
    0,
    Math.ceil(predictedDemand - inventory.currentStock + safetyStock),
  );

  return {
    upc: inventory.upc,
    name: inventory.name,
    category: inventory.category,
    currentStock: inventory.currentStock,
    predictedDemand14d: predictedDemand,
    suggestedOrder,
    confidence,
    source: 'statistical',
    chartData,
  };
}

export function buildForecastsForInventory(
  inventoryItems: InventoryRecord[],
  salesByUpc: Map<string, SalesRecord[]>,
  localEvents: LocalEvent[],
  options?: { horizon?: number; upc?: string; today?: Date },
): ItemForecast[] {
  const filtered = options?.upc
    ? inventoryItems.filter((item) => item.upc === options.upc)
    : inventoryItems;

  return filtered.map((item) =>
    buildItemForecast({
      inventory: item,
      salesHistory: salesByUpc.get(item.upc) ?? [],
      localEvents,
      horizon: options?.horizon,
      today: options?.today,
    }),
  );
}