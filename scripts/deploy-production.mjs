#!/usr/bin/env node
/**
 * Full production deploy: backend + data + frontend for install-ready PWA.
 *
 * Usage:
 *   aws login
 *   npm run deploy:production
 *   npm run deploy:production -- --bootstrap-owner --username=owner@hangarliquor.com --password='TempPass1!'
 */
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function arg(name) {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
}

function run(cmd, label) {
  console.log(`\n▶ ${label}`);
  console.log(`  ${cmd}`);
  execSync(cmd, { cwd: root, stdio: 'inherit', env: process.env });
}

function main() {
  console.log('Hanger Liquor — production deploy');
  console.log('==================================\n');

  try {
    const id = execSync('aws sts get-caller-identity --query Account --output text', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    console.log(`✅ AWS account ${id}`);
  } catch {
    console.error('❌ AWS credentials missing or expired.');
    console.error('   Run: aws login');
    process.exit(1);
  }

  run('npm run build:backend', 'Build Lambda bundles');
  run('cd terraform && terraform init -input=false', 'Terraform init');
  run('cd terraform && terraform apply -auto-approve -var="store_id=hanger"', 'Terraform apply');

  run('npx tsx scripts/sync-aws-env.ts --write-dotenv', 'Sync Terraform outputs → .env');
  run('npm run prep:aws', 'Load product catalog + seed inventory');

  if (hasFlag('bootstrap-owner')) {
    const username = arg('username');
    const password = arg('password');
    if (!username || !password) {
      console.error('bootstrap-owner requires --username= and --password=');
      process.exit(1);
    }
    run(
      `npx tsx scripts/bootstrap-owner.ts --username=${username} --password='${password}'`,
      'Create Owner user in Cognito',
    );
  }

  run('node scripts/deploy-frontend.mjs', 'Build + deploy PWA to CloudFront');

  const frontendUrl = execSync('terraform -chdir=terraform output -raw frontend_url', {
    cwd: root,
    encoding: 'utf8',
  }).trim();

  console.log('\n🎉 Production ready');
  console.log(`   App URL:  ${frontendUrl}`);
  console.log('   Login:    use Cognito owner account (or bootstrap with --bootstrap-owner)');
  console.log('   Install:  open URL on phone → More → follow install steps');
  console.log(`   Android native (ML Kit):  npm run build:android && npm run upload:android-apk && npm run deploy:frontend`);
  console.log(`   Android legacy (PWABuilder): npm run package:android -- ${frontendUrl}`);
}

main();