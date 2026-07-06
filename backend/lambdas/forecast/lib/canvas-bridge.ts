import type { ItemForecast, SalesRecord } from '../../../shared/types/forecast';
import { buildItemForecast } from './forecast-engine';

/**
 * Optional SageMaker Canvas / Serverless Inference bridge.
 *
 * Training workflow (offline):
 * 1. Export sales history CSV from DynamoDB (see scripts/export-sales-for-canvas.ts)
 * 2. Train model in SageMaker Canvas (Time series forecasting)
 * 3. Deploy to Serverless Inference endpoint and set SAGEMAKER_ENDPOINT_NAME
 * 4. Request forecasts with ?model=canvas
 *
 * Note: Requires @aws-sdk/client-sagemaker-runtime in backend.
 * Install: cd backend && npm install @aws-sdk/client-sagemaker-runtime
 */
export async function getCanvasForecasts(params: {
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

  try {
    // Dynamic import so it doesn't break if SDK not installed
    const { SageMakerRuntimeClient, InvokeEndpointCommand } = await import(
      '@aws-sdk/client-sagemaker-runtime'
    );

    const client = new SageMakerRuntimeClient({});

    // Build a simple payload. For a real Canvas TS model the exact schema
    // depends on how you trained it (see SageMaker Canvas export for inference schema).
    // Canvas typically accepts JSON with "instances" or custom features.
    // Adapt this based on your trained model. We send a minimal request here.
    // In production serialize recent sales + features for the items to forecast.
    const payload = {
      instances: Array.from(params.salesByUpc.entries()).slice(0, 5).map(([upc, sales]) => ({
        upc,
        recent: sales.slice(-14).map(s => s.quantity), // last 14 days as example
        horizon: params.horizon,
      })),
    };

    const command = new InvokeEndpointCommand({
      EndpointName: endpointName,
      ContentType: 'application/json',
      Accept: 'application/json',
      Body: JSON.stringify(payload),
    });

    const response = await client.send(command);
    const body = new TextDecoder().decode(response.Body as Uint8Array);
    const result = JSON.parse(body);

    // Canvas response shape varies; assume it returns predictions array.
    // For robustness we fall back to building from statistical if shape unexpected.
    if (result.predictions && Array.isArray(result.predictions)) {
      // Map back to our ItemForecast shape using inventory we already have in caller.
      // Here we return a simplified version; real impl would merge with inventory data.
      return result.predictions.map((p: any, idx: number) => {
        const upc = p.upc || Array.from(params.salesByUpc.keys())[idx] || 'unknown';
        return {
          upc,
          name: p.name || `Item ${upc}`,
          category: p.category || 'General',
          currentStock: p.currentStock || 0,
          predictedDemand14d: p.predicted || (p.predictions ? p.predictions[0] : 0),
          suggestedOrder: Math.max(0, Math.round((p.predicted || 0) * 0.8)),
          confidence: 'high' as const,
          source: 'sagemaker' as const,
          chartData: [],
        };
      });
    }

    // If unexpected shape, fall back gracefully
    throw new Error('Unexpected Canvas response shape');
  } catch (err: any) {
    throw new CanvasBridgeUnavailableError(
      `SageMaker endpoint "${endpointName}" call failed: ${err.message || err}. Falling back to statistical.`
    );
  }
}

export class CanvasBridgeUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CanvasBridgeUnavailableError';
  }
}