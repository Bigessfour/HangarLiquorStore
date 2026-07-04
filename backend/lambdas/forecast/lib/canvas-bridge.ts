import type { ItemForecast, SalesRecord } from '../../../shared/types/forecast';
import { buildItemForecast } from './forecast-engine';

/**
 * Optional SageMaker Canvas / Serverless Inference bridge.
 *
 * Training workflow (offline):
 * 1. Export sales history CSV from DynamoDB
 * 2. Train model in SageMaker Canvas
 * 3. Deploy to a Serverless endpoint and set SAGEMAKER_ENDPOINT_NAME
 * 4. Request forecasts with ?model=canvas
 */
export async function getCanvasForecasts(_params: {
  salesByUpc: Map<string, SalesRecord[]>;
  horizon: number;
  upc?: string;
}): Promise<ItemForecast[]> {
  const endpointName = process.env.SAGEMAKER_ENDPOINT_NAME;

  if (!endpointName) {
    throw new CanvasBridgeUnavailableError(
      'SageMaker endpoint is not configured. Use statistical forecasting (?model=statistical).',
    );
  }

  // Placeholder for future SageMaker Runtime invoke integration.
  throw new CanvasBridgeUnavailableError(
    `SageMaker endpoint "${endpointName}" integration is not yet implemented.`,
  );
}

export class CanvasBridgeUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CanvasBridgeUnavailableError';
  }
}

export function applyCanvasBasePredictions(
  statisticalForecasts: ItemForecast[],
): ItemForecast[] {
  return statisticalForecasts.map((forecast) =>
    buildItemForecast({
      inventory: {
        upc: forecast.upc,
        name: forecast.name,
        category: forecast.category,
        currentStock: forecast.currentStock,
      },
      salesHistory: forecast.chartData
        .filter((point) => point.actual !== undefined)
        .map((point) => ({
          upc: forecast.upc,
          date: point.date,
          quantity: point.actual ?? 0,
        })),
      localEvents: [],
      horizon: 14,
    }),
  );
}