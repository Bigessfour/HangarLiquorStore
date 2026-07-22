import type { ItemForecast, SalesRecord } from '../../../shared/types/forecast';

/**
 * Optional SageMaker Canvas / Serverless Inference bridge.
 *
 * Amazon Forecast is NOT used (closed to new customers 2024-07-29).
 * This is the only higher-accuracy path beyond the statistical cash-impact engine.
 *
 * Training workflow (offline) — see docs/sagemaker-optimization.md:
 * 1. npm run export-sales-for-canvas
 * 2. Train time-series model in SageMaker Canvas
 * 3. Deploy Serverless Inference; set SAGEMAKER_ENDPOINT_NAME
 * 4. GET /api/forecast?model=canvas — caller merges onto statistical SKUs
 *
 * Invoked only from forecast/optimize/profit paths — never on scan.
 * Requires: cd backend && npm install @aws-sdk/client-sagemaker-runtime
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
    const { SageMakerRuntimeClient, InvokeEndpointCommand } = await import(
      '@aws-sdk/client-sagemaker-runtime'
    );

    const client = new SageMakerRuntimeClient({});

    const entries = params.upc
      ? ([[params.upc, params.salesByUpc.get(params.upc) ?? []]] as [string, SalesRecord[]][])
      : Array.from(params.salesByUpc.entries());

    // Cap payload size; caller merges onto full inventory statistical set
    const payload = {
      instances: entries.slice(0, 50).map(([upc, sales]) => ({
        upc,
        recent: sales.slice(-14).map((s) => s.quantity),
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

    if (result.predictions && Array.isArray(result.predictions)) {
      return result.predictions.map((p: Record<string, unknown>, idx: number) => {
        const upc =
          (typeof p.upc === 'string' && p.upc) ||
          entries[idx]?.[0] ||
          params.upc ||
          'unknown';
        const predicted = Number(
          p.predicted ?? (Array.isArray(p.predictions) ? p.predictions[0] : 0),
        );
        return {
          upc,
          name: typeof p.name === 'string' ? p.name : `Item ${upc}`,
          category: typeof p.category === 'string' ? p.category : 'General',
          currentStock: Number(p.currentStock ?? 0),
          predictedDemand14d: predicted,
          suggestedOrder: Math.max(0, Math.round(predicted * 0.8)),
          confidence: 'high' as const,
          source: 'sagemaker' as const,
          chartData: [],
        };
      });
    }

    throw new Error('Unexpected Canvas response shape');
  } catch (err: unknown) {
    if (err instanceof CanvasBridgeUnavailableError) throw err;
    const message = err instanceof Error ? err.message : String(err);
    throw new CanvasBridgeUnavailableError(
      `SageMaker endpoint "${endpointName}" call failed: ${message}. Falling back to statistical.`,
    );
  }
}

export class CanvasBridgeUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CanvasBridgeUnavailableError';
  }
}
