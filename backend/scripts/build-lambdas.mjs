#!/usr/bin/env node
/**
 * Bundle Lambda handlers for terraform apply.
 * Output: backend/lambda-dist/{inventory,forecast,events}/
 */
import * as esbuild from 'esbuild';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outRoot = join(root, 'lambda-dist');

const bundles = [
  {
    entry: join(root, 'lambdas/inventory/inventory-api.ts'),
    outfile: join(outRoot, 'inventory/inventory-api.js'),
  },
  {
    entry: join(root, 'lambdas/forecast/get-forecast.ts'),
    outfile: join(outRoot, 'forecast/get-forecast.js'),
  },
  {
    entry: join(root, 'lambdas/forecast/manage-events.ts'),
    outfile: join(outRoot, 'events/manage-events.js'),
  },
  {
    entry: join(root, 'lambdas/square/square-api.ts'),
    outfile: join(outRoot, 'square/square-api.js'),
  },
];

rmSync(outRoot, { recursive: true, force: true });
mkdirSync(outRoot, { recursive: true });

for (const bundle of bundles) {
  mkdirSync(dirname(bundle.outfile), { recursive: true });
  await esbuild.build({
    entryPoints: [bundle.entry],
    outfile: bundle.outfile,
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    sourcemap: true,
    external: ['@aws-sdk/*'],
  });
  console.log(`Built ${bundle.outfile}`);
}

console.log('Lambda bundles ready in backend/lambda-dist/');