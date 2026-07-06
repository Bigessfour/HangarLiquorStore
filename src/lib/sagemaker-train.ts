/**
 * SageMaker Canvas integration helper for Hanger Liquor Store.
 *
 * IMPORTANT: Per project architecture (AGENTS.md + design):
 * - Model *training* happens **offline** in AWS SageMaker Canvas (no-code).
 * - Use `npm run export-sales-for-canvas` (or the script) to generate training CSV from DynamoDB.
 * - Upload the CSV to SageMaker Canvas, train a time-series forecasting model (target=quantity, item_id=upc, timestamp=date).
 * - Deploy the model to a Serverless Inference endpoint.
 * - Set SAGEMAKER_ENDPOINT_NAME in Terraform / Lambda env.
 * - Frontend/backend then use ?model=canvas for higher-accuracy inference (with graceful fallback to statistical engine).
 *
 * This file provides helpers + UI-ready action for the "Train Hanger Model" flow.
 * It does NOT submit training jobs directly (that would require heavy privileged backend + is not the intended no-code path).
 */

import { toast } from 'sonner';

export interface CanvasTrainingPrep {
  instructions: string[];
  exportCommand: string;
  nextSteps: string[];
}

/**
 * Returns the exact steps to prepare and train a new/updated forecast model for Hanger in SageMaker Canvas.
 * Called from the dashboard "Train Hanger Model" button.
 */
export function getHangerCanvasTrainingInstructions(): CanvasTrainingPrep {
  return {
    instructions: [
      '1. Ensure recent sales data exists in HangerSalesHistory (scans + any manual imports).',
      '2. Run the export script to generate the training CSV from your DynamoDB data.',
      '3. In AWS Console: open SageMaker Canvas → Time series forecasting → Import the CSV.',
      '4. Build the model (item identifier = upc, target = quantity, timestamp = date). Include any event/holiday features if desired.',
      '5. Deploy the trained model to a real-time / Serverless inference endpoint.',
      '6. Note the endpoint name and update your Terraform var + re-apply (or set in Lambda env).',
      '7. Toggle "Use SageMaker Canvas" in the Forecast dashboard to use the high-accuracy model.',
    ],
    exportCommand: 'npm run export-sales-for-canvas -- --store-id=hanger --output=sales-for-canvas.csv',
    nextSteps: [
      'Upload sales-for-canvas.csv to SageMaker Canvas in the target AWS account.',
      'After endpoint is live, set SAGEMAKER_ENDPOINT_NAME and redeploy the stack.',
      'The statistical engine remains the default/primary for cost & reliability.',
    ],
  };
}

/**
 * UI action for the dashboard button.
 * In a future iteration this could call a backend that triggers an export job + notifies.
 * Today it provides the exact copy-paste workflow + a toast.
 */
export async function trainHangerForecastModel(): Promise<{ success: boolean; message: string }> {
  const prep = getHangerCanvasTrainingInstructions();

  // For now this is the "training trigger" – it surfaces the designed offline Canvas workflow.
  // In production you could add:
  //   - POST to a lightweight /api/prepare-canvas-export that runs the export script via Step Functions / Lambda
  //   - Or just link to an S3 presigned location of the latest export.

  console.log('[Hanger SageMaker] Training prep requested for Hanger Liquor Store');
  console.log('Export command:', prep.exportCommand);

  // Show clear guidance to the user (rural store staff friendly)
  toast.success('SageMaker Canvas training workflow ready', {
    description: 'Run the export command in your terminal, then train in Canvas. See console for details.',
    duration: 8000,
  });

  // Also surface in console for power users / devs
  console.group('Hanger Liquor Store – SageMaker Canvas Training Steps');
  prep.instructions.forEach((line) => console.log(line));
  console.log('\nExport command:\n  ' + prep.exportCommand);
  prep.nextSteps.forEach((line) => console.log(line));
  console.groupEnd();

  return {
    success: true,
    message: 'Canvas training instructions prepared. Use the export script + AWS SageMaker Canvas (no-code).',
  };
}

// Re-export for convenience if other modules want the raw steps
export { getHangerCanvasTrainingInstructions as prepareCanvasTrainingData };
