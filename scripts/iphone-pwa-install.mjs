#!/usr/bin/env node
/**
 * iPhone / iPad permanent PWA install helper.
 *
 * Opens the production HTTPS URL (or LAN demo) and prints a scannable QR + Safari steps.
 *
 * Usage:
 *   npm run iphone:install              # production URL from terraform / .env.production
 *   npm run iphone:install -- --demo    # LAN dev server for quick local test
 *   npm run iphone:install -- https://d1imxsgur21o71.cloudfront.net
 */
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function readEnvValue(key) {
  const prodPath = path.join(root, '.env.production');
  if (!fs.existsSync(prodPath)) return '';
  const line = fs
    .readFileSync(prodPath, 'utf8')
    .split('\n')
    .find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : '';
}

function tfOutput(name) {
  try {
    return execSync(`terraform -chdir=terraform output -raw ${name}`, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return '';
  }
}

function resolveAppUrl() {
  const argUrl = process.argv.find((a) => a.startsWith('https://'));
  if (argUrl) return argUrl.replace(/\/$/, '');

  if (process.argv.includes('--demo')) {
    const port = process.env.DEMO_PORT || '5173';
    const lan = execSync(`node scripts/get-lan-url.mjs`, { cwd: root, encoding: 'utf8' }).trim();
    return lan.replace(/:\d+$/, `:${port}`);
  }

  return (
    readEnvValue('VITE_PWA_URL') ||
    tfOutput('frontend_url') ||
    'https://d1imxsgur21o71.cloudfront.net'
  ).replace(/\/$/, '');
}

function main() {
  const appUrl = resolveAppUrl();
  const isHttps = appUrl.startsWith('https://');
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(appUrl)}`;
  const installPath = `${appUrl}/more`;

  console.log('\n📱 Hanger Liquor — iPhone / iPad PWA Install\n');
  console.log('═'.repeat(56));
  console.log(`App URL:     ${appUrl}`);
  console.log(`Install UI:  ${installPath}`);
  console.log(`QR image:    ${qrUrl}`);
  console.log('═'.repeat(56));

  if (!isHttps) {
    console.log('\n⚠️  HTTP LAN URLs cannot install as a permanent PWA on iPhone.');
    console.log('   Use production HTTPS for Add to Home Screen, or test UI in Safari only.');
    console.log('   Run: npm run deploy:frontend  (after terraform) for permanent install.\n');
  }

  console.log('\nOn your iPhone (Safari — not Chrome, not in-app browsers):\n');
  console.log('  1. Scan the QR above with Camera, or AirDrop/message yourself the App URL.');
  console.log('  2. Open the link in Safari.');
  console.log('  3. Log in (demo Owner: chris.emick.owner@hangar.demo / ChrisDemo1!)');
  console.log('  4. Tap Share (□↑) at the bottom → Add to Home Screen → Add.');
  console.log('  5. Open the Hanger icon — full-screen app, offline cache enabled.');
  console.log('  6. Scan page: use Take Photo of Barcode (live camera is limited in iOS PWA).');
  console.log('  7. More → Install the app has QR print/download for staff.\n');

  if (isHttps) {
    console.log('Permanent test build: this URL survives reboots until you remove the icon.');
    console.log(`PWABuilder report: https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(appUrl)}\n`);
  }

  if (process.argv.includes('--open') && process.platform === 'darwin') {
    execSync(`open "${appUrl}"`, { stdio: 'ignore' });
  }
}

main();