#!/usr/bin/env node
/**
 * Build production PWA and deploy to S3 + CloudFront invalidation.
 *
 * Prerequisites:
 *   terraform apply complete
 *   .env.production (run: npx tsx scripts/sync-aws-env.ts)
 *
 * Usage:
 *   npm run deploy:frontend
 */
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function tfOutput(name) {
  return execSync(`terraform -chdir=terraform output -raw ${name}`, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

function run(cmd, label) {
  console.log(`\n▶ ${label}`);
  execSync(cmd, { cwd: root, stdio: 'inherit', env: process.env });
}

function main() {
  const envProd = path.join(root, '.env.production');
  if (!fs.existsSync(envProd)) {
    console.error('Missing .env.production — run: npx tsx scripts/sync-aws-env.ts');
    process.exit(1);
  }

  try {
    execSync('aws sts get-caller-identity', { stdio: 'pipe' });
  } catch {
    console.error('AWS credentials missing or expired. Run: aws login');
    process.exit(1);
  }

  const bucket = tfOutput('frontend_bucket');
  const distributionId = tfOutput('cloudfront_distribution_id');
  const frontendUrl = tfOutput('frontend_url');

  run('npm run generate:pwa-icons', 'Generate PWA icons');
  run('npm run build -- --mode production', 'Build production PWA');

  const dist = path.join(root, 'dist');
  if (!fs.existsSync(path.join(dist, 'index.html'))) {
    console.error('dist/index.html missing — build failed?');
    process.exit(1);
  }

  run(
    `aws s3 sync dist/ s3://${bucket}/ --delete --exclude "hanger-liquor-native.apk"`,
    `Upload → s3://${bucket}`,
  );

  const apkPath = path.join(root, 'dist', 'mobile-apk', 'app-debug.apk');
  if (fs.existsSync(apkPath)) {
    run(
      `aws s3 cp "${apkPath}" "s3://${bucket}/hanger-liquor-native.apk" --content-type application/vnd.android.package-archive`,
      'Refresh native Android APK',
    );
  }

  run(
    `aws cloudfront create-invalidation --distribution-id ${distributionId} --paths "/*"`,
    'Invalidate CloudFront cache',
  );

  console.log('\n✅ Frontend deployed');
  console.log(`   Install URL: ${frontendUrl}`);
  console.log('   Staff: More → Install the app, or scan the QR');
  console.log(`   PWABuilder: https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(frontendUrl)}`);
}

main();