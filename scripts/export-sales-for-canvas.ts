#!/usr/bin/env tsx
/**
 * Export sales history from DynamoDB as CSV for SageMaker Canvas training.
 *
 * Usage (after setting AWS_PROFILE or credentials for the target account):
 *   npx tsx scripts/export-sales-for-canvas.ts --store-id=hanger --output=sales.csv
 *
 * Output format (recommended for Canvas time-series):
 *   date,upc,quantity,category,event_multiplier
 *
 * Then upload the CSV to SageMaker Canvas in the client's AWS account,
 * build a time-series forecasting model, and deploy to a Serverless endpoint.
 * See Docs/client-deployment.md and the SageMaker workflow for full steps.
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
  category?: string;
  event_multiplier?: number;
}

interface InventoryItem {
  upc: string;
  category: string;
}

interface LocalEvent {
  startDate: string;
  endDate: string;
  multiplier: number;
}

async function exportSales(): Promise<void> {
  console.log(`Exporting sales from table ${tableName} (storeId=${storeId})...`);

  // Load inventory for categories
  const inventoryTable = process.env.INVENTORY_TABLE || 'HangerInventory';
  const inventoryMap = new Map<string, string>();
  try {
    let invKey: Record<string, any> | undefined;
    do {
      const invRes = await docClient.send(new ScanCommand({
        TableName: inventoryTable,
        ExclusiveStartKey: invKey,
      }));
      if (invRes.Items) {
        for (const it of invRes.Items) {
          if (it.upc && it.category) inventoryMap.set(it.upc, it.category);
        }
      }
      invKey = invRes.LastEvaluatedKey;
    } while (invKey);
  } catch (e) {
    console.warn('Could not load inventory categories (optional):', e);
  }

  // Load local events for multiplier computation
  const eventsTable = process.env.LOCAL_EVENTS_TABLE || 'HangerLocalEvents';
  const events: LocalEvent[] = [];
  try {
    let evKey: Record<string, any> | undefined;
    do {
      const evRes = await docClient.send(new QueryCommand({
        TableName: eventsTable,
        KeyConditionExpression: 'storeId = :sid',
        ExpressionAttributeValues: { ':sid': storeId },
        ExclusiveStartKey: evKey,
      }));
      if (evRes.Items) {
        for (const ev of evRes.Items) {
          if (ev.startDate && ev.endDate && ev.multiplier) {
            events.push({
              startDate: ev.startDate,
              endDate: ev.endDate,
              multiplier: ev.multiplier,
            });
          }
        }
      }
      evKey = evRes.LastEvaluatedKey;
    } while (evKey);
  } catch (e) {
    console.warn('Could not load events (multipliers default to 1):', e);
  }

  function getEventMultiplier(date: string): number {
    let max = 1;
    for (const ev of events) {
      if (date >= ev.startDate && date <= ev.endDate) {
        max = Math.max(max, ev.multiplier);
      }
    }
    return max;
  }

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
        if (item.upc && item.date && typeof item.quantity === 'number') {
          records.push({
            upc: item.upc,
            date: item.date,
            quantity: item.quantity,
            category: inventoryMap.get(item.upc) || 'Unknown',
            event_multiplier: getEventMultiplier(item.date),
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

  const header = 'date,upc,quantity,category,event_multiplier\n';
  const csv = records
    .map(r => `${r.date},${r.upc},${r.quantity},${r.category},${r.event_multiplier}`)
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
