#!/usr/bin/env tsx
/**
 * Load filtered Open Food Facts liquor products into DynamoDB HangerProducts table.
 *
 * Prerequisites:
 * - AWS credentials for the target account (hanger-liquor-client profile or env)
 * - Run after filtering: npx tsx scripts/filter-off-liquor-dump.ts
 *
 * Usage:
 *   node scripts/load-filtered-products-to-ddb.ts   # (uses tsx under npm or npx)
 *   npm run load-products
 *
 * Seeds DynamoDB HangerProducts with a realistic small-town liquor store sample.
 * Current default (scripts/table.csv) is a curated ~56 item sample suitable for rural Colorado
 * stores like Hanger Liquor (Wiley, CO). Heavy on everyday beer + popular spirits, basic wine,
 * and mixers. Not exhaustive — edge cases can be added later via the app's inventory flows.
 *
 * For full production:
 *   1. Download Open Food Facts dump from https://world.openfoodfacts.org/data/
 *   2. npx tsx scripts/filter-off-liquor-dump.ts --input=... --output=liquor.jsonl
 *   3. npx tsx scripts/load-filtered-products-to-ddb.ts --input=liquor.jsonl
 *
 * Supports both CSV (small town sample) and full OFF JSONL.
 *
 * For production: Run this periodically or on new dump, or use Glue/Step Functions.
 * Cost: DDB write capacity (on-demand is fine for one-time).
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import * as fs from 'fs';
import * as readline from 'readline';
import { program } from 'commander';
import Papa from 'papaparse';

program
  .option('--input <file>', 'JSON array, JSONL, or CSV product catalog', 'shared/product-catalog.json')
  .option('--table <name>', 'DynamoDB table name', 'HangerProducts')
  .option('--store-id <id>', 'Store ID for tags', 'hanger')
  .option('--batch-size <n>', 'Batch size for writes', '25')
  .parse();

const opts = program.opts();

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const BATCH_SIZE = parseInt(opts.batchSize);

async function loadProducts() {
  const inputFile = opts.input;
  const lower = inputFile.toLowerCase();
  const isCsv = lower.endsWith('.csv');
  const isJsonArray = lower.endsWith('.json');

  let batch: any[] = [];
  let total = 0;
  let written = 0;

  if (isJsonArray) {
    const raw = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
    const rows = Array.isArray(raw) ? raw : raw.products;
    if (!Array.isArray(rows)) {
      throw new Error('JSON catalog must be an array or { products: [] }');
    }
    for (const row of rows) {
      const upc = String(row.upc || row.code || '').replace(/\D/g, '');
      if (!upc) continue;
      const name = row.name || row.product_name || row.brands || 'Unknown Product';
      const item = {
        upc,
        name,
        category: row.category || mapCategory([], name),
        photo: row.photo || row.image_url || null,
        brands: row.brands || null,
        quantity: row.quantity || null,
        packSize: row.packSize || extractPackSize(row.quantity, name),
        source: row.source || 'hanger-catalog',
        updatedAt: new Date().toISOString(),
      };
      batch.push({ PutRequest: { Item: item } });
      total++;
      if (batch.length >= BATCH_SIZE) {
        await writeBatch(batch);
        written += batch.length;
        batch = [];
      }
    }
  } else if (isCsv) {
    // Support "table.csv" style liquor item seeds (or any CSV with compatible columns)
    const csvContent = fs.readFileSync(inputFile, 'utf8');
    const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
    if (parsed.errors && parsed.errors.length) {
      console.warn('CSV parse warnings:', parsed.errors.slice(0, 3));
    }
    for (const row of parsed.data as any[]) {
      try {
        // Flexible column mapping for table.csv / seed CSV
        const code = row.code || row.upc || row.UPC || row['UPC-A'] || row.sku;
        if (!code) continue;
        const product_name = row.product_name || row.name || row.Name || row.title || 'Unknown Product';
        const brands = row.brands || row.brand || row.Brand || null;
        const quantity = row.quantity || row.size || row.pack || null;
        const cats = row.categories_tags ? (Array.isArray(row.categories_tags) ? row.categories_tags : row.categories_tags.split(/[,|;]/)) : (row.categories || '').split(/[,|;]/);

        const name = product_name || brands || 'Unknown Product';
        const packSize = extractPackSize(quantity, name);

        const item = {
          upc: String(code).replace(/\D/g, ''), // normalize to digits only like OFF
          name,
          category: mapCategory(cats, name),
          photo: row.image_url || row.photo || row.image || null,
          brands,
          quantity,
          packSize,
          source: row.source || 'csv-seed',
          updatedAt: new Date().toISOString(),
        };

        if (!item.upc) continue;

        batch.push({ PutRequest: { Item: item } });
        total++;

        if (batch.length >= BATCH_SIZE) {
          await writeBatch(batch);
          written += batch.length;
          batch = [];
          if (total % 100 === 0) console.log(`Processed ${total} CSV entries...`);
        }
      } catch (err) {
        console.warn('Skipping bad CSV row:', err);
      }
    }
  } else {
    // Original JSONL path (from filter-off-liquor-dump.ts)
    const fileStream = fs.createReadStream(inputFile);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

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
