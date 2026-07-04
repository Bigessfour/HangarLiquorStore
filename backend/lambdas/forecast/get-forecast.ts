import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { CanvasBridgeUnavailableError, getCanvasForecasts } from './lib/canvas-bridge';
import { getInventoryItems, getLocalEvents, getSalesHistoryForUpc } from './lib/dynamodb';
import { buildForecastsForInventory } from './lib/forecast-engine';
import { errorResponse, jsonResponse } from './lib/response';

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  if (event.requestContext.http.method === 'OPTIONS') {
    return jsonResponse(200, {});
  }

  try {
    const horizon = Number(event.queryStringParameters?.horizon ?? 14);
    const upc = event.queryStringParameters?.upc;
    const model = event.queryStringParameters?.model ?? 'statistical';

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