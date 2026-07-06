#!/usr/bin/env tsx
/**
 * Filter Open Food Facts dump to liquor/alcohol entries only.
 *
 * Download a dump first (e.g. from https://world.openfoodfacts.org/data ):
 *   - JSONL: openfoodfacts-products.jsonl.gz
 *   - Or Parquet/CSV for easier processing.
 *
 * Usage:
 *   npx tsx scripts/filter-off-liquor-dump.ts --input=openfoodfacts-products.jsonl.gz --output=liquor-products.jsonl
 *
 * Then load the filtered JSONL into DynamoDB HangerProducts table (upc as key).
 *
 * This keeps only relevant entries for Hanger Liquor Store, dramatically reducing size and cost.
 *
 * Liquor filter criteria (customize as needed):
 * - categories_tags containing "alcoholic-beverages", "beers", "wines", "spirits", "whiskies", etc.
 * - or product_name/brands containing liquor keywords.
 */

import * as fs from 'fs';
import * as readline from 'readline';
import * as zlib from 'zlib';
import { program } from 'commander';

program
  .option('--input <file>', 'Input dump file (supports .gz)', 'openfoodfacts-products.jsonl.gz')
  .option('--output <file>', 'Output filtered file', 'liquor-products.jsonl')
  .parse();

const options = program.opts();

const LIQUOR_KEYWORDS = [
  'alcoholic-beverages',
  'beers',
  'wines',
  'spirits',
  'whiskies',
  'whiskey',
  'vodka',
  'gin',
  'rum',
  'tequila',
  'brandy',
  'liqueur',
  'champagne',
  'beer',
  'wine',
  'alcoholic',
];

function isLiquorProduct(line: string): boolean {
  try {
    const product = JSON.parse(line);
    const cats = (product.categories_tags || []).join(' ').toLowerCase();
    const name = (product.product_name || '').toLowerCase();
    const brands = (product.brands || '').toLowerCase();
    const categories = (product.categories || '').toLowerCase();

    // Strong filter: prefer explicit alcoholic categories, or keyword match
    const hasAlcoholicCat = cats.includes('alcoholic-beverages') || 
                            cats.includes('en:alcoholic-beverages') ||
                            cats.includes('beers') || cats.includes('wines') || 
                            cats.includes('spirits') || cats.includes('whiskies');

    const keywordMatch = LIQUOR_KEYWORDS.some(kw =>
      cats.includes(kw) || name.includes(kw) || brands.includes(kw) || categories.includes(kw)
    );

    return hasAlcoholicCat || keywordMatch;
  } catch {
    return false;
  }
}

async function filterDump() {
  const inputStream = fs.createReadStream(options.input);
  const gunzip = options.input.endsWith('.gz') ? zlib.createGunzip() : null;
  const source = gunzip ? inputStream.pipe(gunzip) : inputStream;

  const rl = readline.createInterface({ input: source, crlfDelay: Infinity });

  const outStream = fs.createWriteStream(options.output);

  let count = 0;
  let kept = 0;

  for await (const line of rl) {
    count++;
    if (isLiquorProduct(line)) {
      outStream.write(line + '\n');
      kept++;
    }
    if (count % 100000 === 0) {
      console.log(`Processed ${count} lines, kept ${kept} liquor entries...`);
    }
  }

  outStream.end();
  console.log(`Done. Processed ${count} lines. Kept ${kept} liquor entries in ${options.output}`);
}

filterDump().catch(console.error);
