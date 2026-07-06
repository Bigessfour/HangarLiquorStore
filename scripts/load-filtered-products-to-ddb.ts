#!/usr/bin/env tsx
/**
 * Load filtered Open Food Facts liquor products into DynamoDB HangerProducts table.
 *
 * Prerequisites:
 * - AWS credentials for the target account (hanger-liquor-client profile or env)
 * - Run after filtering: npx tsx scripts/filter-off-liquor-dump.ts
 *
 * Usage:
 *   npx tsx scripts/load-filtered-products-to-ddb.ts --input=liquor-products.jsonl --table=HangerProducts --store-id=hanger
 *
 * This populates the products table from the OFF dump subset.
 * Only liquor entries are loaded (see filter script).
 *
 * For production: Run this periodically or on new dump, or use Glue/Step Functions.
 * Cost: DDB write capacity (on-demand is fine for one-time).
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import * as fs from 'fs';
import * as readline from 'readline';
import { program } from 'commander';

program
  .option('--input <file>', 'Filtered JSONL file', 'liquor-products.jsonl')
  .option('--table <name>', 'DynamoDB table name', 'HangerProducts')
  .option('--store-id <id>', 'Store ID for tags', 'hanger')
  .option('--batch-size <n>', 'Batch size for writes', '25')
  .parse();

const opts = program.opts();

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const BATCH_SIZE = parseInt(opts.batchSize);

async function loadProducts() {
  const fileStream = fs.createReadStream(opts.input);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let batch: any[] = [];
  let total = 0;
  let written = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;

    try {
      const product = JSON.parse(line);

      const name = product.product_name || product.brands || 'Unknown Product';
      const packSize = extractPackSize(product.quantity, name);

      // Map OFF fields to our product schema - normalized for app
      const item = {
        upc: product.code,
        name,
        category: mapCategory(product.categories_tags || [], name),
        photo: product.image_url || product.image_front_url || product.image_small_url || null,  // normalized to 'photo' for frontend
        brands: product.brands || null,
        quantity: product.quantity || null,
        packSize,
        // Add more fields as needed
        source: 'openfoodfacts',
        updatedAt: new Date().toISOString(),
      };

      batch.push({
        PutRequest: { Item: item },
      });

      total++;

      if (batch.length >= BATCH_SIZE) {
        await writeBatch(batch);
        written += batch.length;
        batch = [];
        if (total % 1000 === 0) console.log(`Processed ${total} entries...`);
      }
    } catch (err) {
      console.warn('Skipping bad line:', err);
    }
  }

  if (batch.length > 0) {
    await writeBatch(batch);
    written += batch.length;
  }

  console.log(`Done. Loaded ${written} liquor products into ${opts.table}`);
}

function mapCategory(cats: string[], name: string): string {
  const text = (cats.join(' ') + ' ' + name).toLowerCase();
  if (text.includes('beer') || text.includes('beers')) return 'Beer';
  if (text.includes('wine') || text.includes('champagne') || text.includes('wines')) return 'Wine';
  if (text.includes('whisk') || text.includes('vodka') || text.includes('gin') || text.includes('rum') || text.includes('spirits') || text.includes('tequila') || text.includes('brandy')) return 'Spirits';
  return 'Mixers';
}

function extractPackSize(quantity: string | null | undefined, name: string): number {
  if (quantity) {
    const match = quantity.toLowerCase().match(/(\d+)\s*(?:x|pk|pack|ct|count)?/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n >= 1 && n <= 48) return n;
    }
  }
  // Fallback from name
  const nameMatch = name.toLowerCase().match(/(\d+)\s*(?:pk|pack|ct|count|x\s*\d+)/);
  if (nameMatch) {
    const n = parseInt(nameMatch[1], 10);
    if (n >= 1 && n <= 48) return n;
  }
  return 1; // default to single
}

async function writeBatch(batch: any[]) {
  const command = new BatchWriteCommand({
    RequestItems: {
      [opts.table]: batch,
    },
  });
  await client.send(command);
  // Small delay to stay under DDB on-demand limits and keep costs predictable
  await new Promise(r => setTimeout(r, 100));
}

loadProducts().catch(console.error);
