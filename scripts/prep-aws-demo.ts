#!/usr/bin/env tsx
/**
 * One-shot AWS demo prep: load product catalog (images) + seed inventory.
 *
 * Prerequisites:
 *   aws login   (or valid AWS_PROFILE)
 *   terraform apply already run
 *
 * Usage:
 *   npm run prep:aws
 *   npm run prep:aws -- --skip-seed
 *   npm run prep:aws -- --products-only
 */
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function arg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
}

const skipSeed = process.argv.includes('--skip-seed');
const productsOnly = process.argv.includes('--products-only');

function run(cmd: string, label: string) {
  console.log(`\n▶ ${label}`);
  console.log(`  ${cmd}`);
  execSync(cmd, { cwd: root, stdio: 'inherit', env: process.env });
}

function tryTerraformOutput(name: string): string | undefined {
  try {
    const out = execSync(`terraform -chdir=terraform output -raw ${name}`, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return out || undefined;
  } catch {
    return undefined;
  }
}

async function main() {
  console.log('Hanger Liquor — AWS demo prep');
  console.log('==============================\n');

  try {
    execSync('aws sts get-caller-identity', { stdio: 'pipe' });
    const id = execSync('aws sts get-caller-identity --query Account --output text', {
      encoding: 'utf8',
    }).trim();
    console.log(`✅ AWS credentials OK (account ${id})`);
  } catch {
    console.error('❌ AWS credentials missing or expired.');
    console.error('   Run: aws login   (or source scripts/set-aws-profile.sh)');
    process.exit(1);
  }

  const catalogPath = path.join(root, 'shared/product-catalog.json');
  if (!fs.existsSync(catalogPath)) {
    console.error('❌ Missing shared/product-catalog.json');
    process.exit(1);
  }

  const productsTable = process.env.PRODUCTS_TABLE || arg('products-table') || 'HangerProducts';
  const inventoryTable = process.env.INVENTORY_TABLE || arg('inventory-table') || 'HangerInventory';

  run(
    `npx tsx scripts/load-filtered-products-to-ddb.ts --input=shared/product-catalog.json --table=${productsTable}`,
    `Load product catalog → ${productsTable}`,
  );

  if (!skipSeed && !productsOnly) {
    run(
      `INVENTORY_TABLE=${inventoryTable} npx tsx scripts/seed-small-town-inventory.ts`,
      `Seed store inventory → ${inventoryTable}`,
    );
  }

  const apiUrl = tryTerraformOutput('api_url');
  const cloudfrontUrl = tryTerraformOutput('frontend_url');
  const poolId = tryTerraformOutput('cognito_user_pool_id');
  const clientId = tryTerraformOutput('cognito_client_id');

  console.log('\n✅ AWS data prep complete.\n');
  console.log('Add to .env when Cognito is ready:');
  if (apiUrl) console.log(`VITE_API_URL=${apiUrl}`);
  if (poolId) console.log(`VITE_COGNITO_USER_POOL_ID=${poolId}`);
  if (clientId) console.log(`VITE_COGNITO_CLIENT_ID=${clientId}`);
  console.log('# VITE_DEMO_AUTH=true   ← use for laptop demo until Cognito login works');
  if (cloudfrontUrl) console.log(`\nPWA URL: ${cloudfrontUrl}`);

  console.log('\nLaptop demo (no Cognito):');
  console.log('  cp .env.demo .env');
  console.log('  npm run demo');
  console.log('\nThen scan UPC 071984000012 or 018200000103 — product image loads from catalog.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});