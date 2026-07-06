import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { CanvasBridgeUnavailableError, getCanvasForecasts } from './lib/canvas-bridge';
import { getInventoryItems, getLocalEvents, getSalesHistoryForUpc } from './lib/dynamodb';
import { getMultiplierForDate } from './lib/event-multiplier';
import { buildForecastsForInventory } from './lib/forecast-engine';
import type { TrendingSuggestion } from '../../shared/types/forecast';
import { errorResponse, jsonResponse } from './lib/response';

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function overlaps(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

async function getTrendingSuggestions(): Promise<TrendingSuggestion[]> {
  const [inventoryItems, localEvents] = await Promise.all([
    getInventoryItems(),
    getLocalEvents(),
  ]);

  if (inventoryItems.length === 0) {
    return [];
  }

  const todayStr = formatDate(new Date());

  // Compute active multiplier from events (lightweight, no extra AWS services)
  let activeMultiplier = 1;
  for (const ev of localEvents) {
    if (overlaps(todayStr, ev.startDate, ev.endDate)) {
      activeMultiplier = Math.max(activeMultiplier, ev.multiplier);
    }
  }
  // Also check static via the helper for date
  activeMultiplier = Math.max(activeMultiplier, getMultiplierForDate(todayStr, localEvents));

  const suggestions: TrendingSuggestion[] = inventoryItems
    .slice(0, 6) // small data set; low cost scan
    .map((item, idx) => {
      const boost = Math.max(0, activeMultiplier - 1);
      const pct = Math.round(12 + boost * 55 + (idx % 3) * 7);
      const suggested = Math.max(2, Math.ceil((boost + 0.25) * (6 + idx % 3)));
      const reasonBase = activeMultiplier > 1.05
        ? `Active event boost x${activeMultiplier.toFixed(2)}`
        : 'Local seasonal / weekend pattern';
      return {
        name: item.name,
        upc: item.upc,
        change: `+${pct}%`,
        reason: reasonBase,
        suggestedAdd: suggested,
      };
    })
    .sort((a, b) => parseFloat(b.change) - parseFloat(a.change))
    .slice(0, 4);

  return suggestions;
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  if (event.requestContext.http.method === 'OPTIONS') {
    return jsonResponse(200, {});
  }

  try {
    const horizon = Number(event.queryStringParameters?.horizon ?? 14);
    const upc = event.queryStringParameters?.upc;
    const model = event.queryStringParameters?.model ?? 'statistical';
    const trending = event.queryStringParameters?.trending === 'true';

    if (trending) {
      const trends = await getTrendingSuggestions();
      return jsonResponse(200, trends);
    }

    if (!Number.isFinite(horizon) || horizon < 1 || horizon > 90) {
      return errorResponse(400, 'horizon must be between 1 and 90');
    }

    const today = new Date();
    const historyStart = formatDate(addDays(today, -90));
    const todayStr = formatDate(today);

    const [inventoryItems, localEvents] = await Promise.all([
      getInventoryItems(upc),
      getLocalEvents(),
    ]);

    const salesByUpc = new Map<string, Awaited<ReturnType<typeof getSalesHistoryForUpc>>>();
    await Promise.all(
      inventoryItems.map(async (item) => {
        const history = await getSalesHistoryForUpc(item.upc, historyStart, todayStr);
        salesByUpc.set(item.upc, history);
      }),
    );

    if (model === 'canvas') {
      try {
        const forecasts = await getCanvasForecasts({ salesByUpc, horizon, upc });
        return jsonResponse(200, upc ? forecasts[0] ?? null : forecasts);
      } catch (error) {
        if (error instanceof CanvasBridgeUnavailableError) {
          return errorResponse(501, error.message);
        }
        throw error;
      }
    }

    const forecasts = buildForecastsForInventory(inventoryItems, salesByUpc, localEvents, {
      horizon,
      upc,
      today,
    });

    return jsonResponse(200, upc ? forecasts[0] ?? null : forecasts);
  } catch (error) {
    console.error('get-forecast error', error);
    return errorResponse(500, 'Failed to generate forecasts');
  }
};