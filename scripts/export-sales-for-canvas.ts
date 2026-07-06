#!/usr/bin/env tsx
/**
 * Export sales history from DynamoDB as CSV for SageMaker Canvas training.
 *
 * Usage (after setting AWS_PROFILE or credentials for the target account):
 *   npx tsx scripts/export-sales-for-canvas.ts --store-id=hanger --output=sales.csv
 *
 * Output format (recommended for Canvas time-series):
 *   date,upc,quantity
 *
 * Then upload the CSV to SageMaker Canvas in the client's AWS account,
 * build a time-series forecasting model, and deploy to a Serverless endpoint.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import * as fs from 'fs';
import * as path from 'path';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const tableName = process.env.SALES_HISTORY_TABLE || 'HangerSalesHistory';
const storeId = process.argv.find(a => a.startsWith('--store-id='))?.split('=')[1] || 'hanger';
const outputFile = process.argv.find(a => a.startsWith('--output='))?.split('=')[1] || 'sales-for-canvas.csv';

interface SalesRecord {
  upc: string;
  date: string;
  quantity: number;
}

async function exportSales(): Promise<void> {
  console.log(`Exporting sales from table ${tableName} (storeId=${storeId})...`);

  const records: SalesRecord[] = [];
  let lastEvaluatedKey: Record<string, any> | undefined;

  do {
    const command = new ScanCommand({
      TableName: tableName,
      ExclusiveStartKey: lastEvaluatedKey,
      // For a real multi-client setup you would filter by a storeId attribute or use a GSI
    });

    const result = await docClient.send(command);

    if (result.Items) {
      for (const item of result.Items) {
        // Adapt to your actual item shape
        if (item.upc && item.date && typeof item.quantity === 'number') {
          records.push({
            upc: item.upc,
            date: item.date,
            quantity: item.quantity,
          });
        }
      }
    }

    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  // Sort by date then upc for nicer CSV
  records.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.upc.localeCompare(b.upc);
  });

  const header = 'date,upc,quantity\n';
  const csv = records
    .map(r => `${r.date},${r.upc},${r.quantity}`)
    .join('\n');

  const fullPath = path.resolve(outputFile);
  fs.writeFileSync(fullPath, header + csv);

  console.log(`Exported ${records.length} records to ${fullPath}`);
  console.log('Upload this file to SageMaker Canvas in the target AWS account for training.');
}

exportSales().catch(err => {
  console.error('Export failed:', err);
  process.exit(1);
});
