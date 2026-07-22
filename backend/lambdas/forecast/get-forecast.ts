import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { CanvasBridgeUnavailableError, getCanvasForecasts } from './lib/canvas-bridge';
import { getInventoryItems, getLocalEvents, getSalesHistoryForUpc } from './lib/dynamodb';
import { getMultiplierForDate } from './lib/event-multiplier';
import { buildForecastsForInventory } from './lib/forecast-engine';
import { runAssistantChat } from './lib/assistant';
import { buildOptimizationImpact, buildProfitSnapshot, periodWindow } from './lib/profit-engine';
import type { TrendingSuggestion } from '../../shared/types/forecast';
import type { ProfitPeriod } from '../../shared/types/profit';
import { errorResponse, jsonResponse } from './lib/response';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

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

function getCallerGroups(event: {
  requestContext?: { authorizer?: { jwt?: { claims?: Record<string, unknown> } } };
}): string[] {
  try {
    const claims = event.requestContext?.authorizer?.jwt?.claims || {};
    const groups = claims['cognito:groups'];
    if (Array.isArray(groups)) return groups as string[];
    if (typeof groups === 'string') return groups.split(',');
    return [];
  } catch {
    return [];
  }
}

function requireManager(groups: string[]) {
  if (!groups.includes('Manager') && !groups.includes('Owner')) {
    throw new Error('Manager role required');
  }
}

function parsePeriod(raw?: string): ProfitPeriod {
  if (raw === 'day' || raw === 'month' || raw === 'year') return raw;
  return 'month';
}

async function loadSquareSyncMeta(): Promise<{
  lastSyncAt: string | null;
  paymentsGrossCents: number | null;
}> {
  const table = process.env.SQUARE_CONNECTION_TABLE;
  const storeId = process.env.STORE_ID || 'hanger';
  if (!table) return { lastSyncAt: null, paymentsGrossCents: null };
  try {
    const res = await ddb.send(new GetCommand({ TableName: table, Key: { storeId } }));
    const item = res.Item as
      | {
          lastSyncAt?: string;
          lastSyncSummary?: { payments?: { paymentsGrossCents?: number } };
          connected?: boolean;
        }
      | undefined;
    if (!item?.connected) return { lastSyncAt: null, paymentsGrossCents: null };
    return {
      lastSyncAt: item.lastSyncAt ?? null,
      paymentsGrossCents: item.lastSyncSummary?.payments?.paymentsGrossCents ?? null,
    };
  } catch {
    return { lastSyncAt: null, paymentsGrossCents: null };
  }
}

async function loadForecastBundle(upc?: string) {
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

  let forecasts = buildForecastsForInventory(inventoryItems, salesByUpc, localEvents, {
    horizon: 14,
    upc,
    today,
  });

  if (process.env.SAGEMAKER_ENDPOINT_NAME) {
    try {
      const canvas = await getCanvasForecasts({ salesByUpc, horizon: 14, upc });
      if (canvas.length > 0) {
        // Merge Canvas predictions onto statistical set — never drop inventory SKUs
        const byUpc = new Map(forecasts.map((f) => [f.upc, f]));
        for (const c of canvas) {
          const existing = byUpc.get(c.upc);
          byUpc.set(c.upc, existing ? { ...existing, ...c, source: 'sagemaker' } : c);
        }
        forecasts = Array.from(byUpc.values());
      }
    } catch (error) {
      if (!(error instanceof CanvasBridgeUnavailableError)) throw error;
    }
  }

  return { inventoryItems, localEvents, salesByUpc, forecasts, today };
}

async function getTrendingSuggestions(): Promise<TrendingSuggestion[]> {
  const [inventoryItems, localEvents] = await Promise.all([getInventoryItems(), getLocalEvents()]);

  if (inventoryItems.length === 0) {
    return [];
  }

  const todayStr = formatDate(new Date());

  let activeMultiplier = 1;
  for (const ev of localEvents) {
    if (overlaps(todayStr, ev.startDate, ev.endDate)) {
      activeMultiplier = Math.max(activeMultiplier, ev.multiplier);
    }
  }
  activeMultiplier = Math.max(activeMultiplier, getMultiplierForDate(todayStr, localEvents));

  const suggestions: TrendingSuggestion[] = inventoryItems
    .slice(0, 6)
    .map((item, idx) => {
      const boost = Math.max(0, activeMultiplier - 1);
      const pct = Math.round(12 + boost * 55 + (idx % 3) * 7);
      const suggested = Math.max(2, Math.ceil((boost + 0.25) * (6 + (idx % 3))));
      const reasonBase =
        activeMultiplier > 1.05
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

  const rawPath = event.rawPath ?? event.requestContext.http.path;
  const method = event.requestContext.http.method;

  try {
    if (rawPath.includes('/profit') && method === 'GET') {
      requireManager(getCallerGroups(event));
      const period = parsePeriod(event.queryStringParameters?.period);
      const [{ inventoryItems, localEvents, salesByUpc, forecasts }, square] = await Promise.all([
        loadForecastBundle(),
        loadSquareSyncMeta(),
      ]);
      const snapshot = buildProfitSnapshot({
        period,
        inventory: inventoryItems,
        salesByUpc,
        forecasts,
        events: localEvents,
        squarePaymentsGrossCents: square.paymentsGrossCents,
        squareLastSyncAt: square.lastSyncAt,
        provenance: process.env.SAGEMAKER_ENDPOINT_NAME ? 'hybrid' : undefined,
      });
      return jsonResponse(200, snapshot);
    }

    if (rawPath.includes('/optimize') && method === 'GET') {
      requireManager(getCallerGroups(event));
      const period = parsePeriod(event.queryStringParameters?.period);
      const { inventoryItems, localEvents, forecasts, salesByUpc } = await loadForecastBundle();
      const window = periodWindow(period);
      const impact = buildOptimizationImpact({
        inventory: inventoryItems,
        forecasts,
        events: localEvents,
        period,
        dayCount: window.dayCount,
        provenance: process.env.SAGEMAKER_ENDPOINT_NAME ? 'hybrid' : 'statistical',
        salesByUpc,
      });
      return jsonResponse(200, impact);
    }

    if (rawPath.includes('/assistant/chat') && method === 'POST') {
      requireManager(getCallerGroups(event));
      const body = event.body ? JSON.parse(event.body) : {};
      const message = String(body.message || '');
      const period = parsePeriod(body.period || event.queryStringParameters?.period);
      const [{ inventoryItems, localEvents, salesByUpc, forecasts }, square] = await Promise.all([
        loadForecastBundle(),
        loadSquareSyncMeta(),
      ]);
      const snapshot = buildProfitSnapshot({
        period,
        inventory: inventoryItems,
        salesByUpc,
        forecasts,
        events: localEvents,
        squarePaymentsGrossCents: square.paymentsGrossCents,
        squareLastSyncAt: square.lastSyncAt,
      });
      const eventsSummary = localEvents.map(
        (e) => `${e.name} ${e.startDate}→${e.endDate} ×${e.multiplier}`,
      );
      const reply = await runAssistantChat({ message, snapshot, eventsSummary, period });
      return jsonResponse(200, reply);
    }

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

    let forecasts: Awaited<ReturnType<typeof buildForecastsForInventory>>;
    if (model === 'canvas') {
      try {
        forecasts = await getCanvasForecasts({ salesByUpc, horizon, upc });
        return jsonResponse(200, upc ? (forecasts[0] ?? null) : forecasts);
      } catch (error) {
        if (error instanceof CanvasBridgeUnavailableError) {
          console.warn('Canvas unavailable, falling back to statistical:', error.message);
        } else {
          throw error;
        }
      }
    }

    forecasts = buildForecastsForInventory(inventoryItems, salesByUpc, localEvents, {
      horizon,
      upc,
      today,
    });

    return jsonResponse(200, upc ? (forecasts[0] ?? null) : forecasts);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate forecasts';
    if (message.includes('Manager role required')) {
      return errorResponse(403, message);
    }
    console.error('get-forecast error', error);
    return errorResponse(
      500,
      message.includes('JSON') ? 'Invalid request body' : 'Failed to generate forecasts',
    );
  }
};
