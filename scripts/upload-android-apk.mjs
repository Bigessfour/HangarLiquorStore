#!/usr/bin/env node
/**
 * Upload native Capacitor APK to the frontend S3 bucket and set VITE_NATIVE_ANDROID_APK_URL.
 *
 * Prerequisites:
 *   npm run build:android   (or pass --apk path)
 *   terraform apply + aws login
 *
 * Usage:
 *   npm run upload:android-apk
 *   npm run upload:android-apk -- --apk path/to/app-debug.apk
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const APK_KEY = 'hanger-liquor-native.apk';

function tfOutput(name) {
  return execSync(`terraform -chdir=terraform output -raw ${name}`, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

function defaultApkPath() {
  const debug = path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
  const release = path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
  if (fs.existsSync(release)) return release;
  return debug;
}

function argApk() {
  const idx = process.argv.indexOf('--apk');
  if (idx >= 0 && process.argv[idx + 1]) return path.resolve(process.argv[idx + 1]);
  return defaultApkPath();
}

function upsertEnvLine(lines, key, value) {
  const prefix = `${key}=`;
  const idx = lines.findIndex((l) => l.startsWith(prefix) || l.startsWith(`# ${key}=`));
  const line = `${key}=${value}`;
  if (idx >= 0) lines[idx] = line;
  else lines.push(line);
  return lines;
}

function main() {
  const apkPath = argApk();
  if (!fs.existsSync(apkPath)) {
    console.error(`APK not found: ${apkPath}`);
    console.error('Build first: npm run build:android');
    process.exit(1);
  }

  try {
    execSync('aws sts get-caller-identity', { stdio: 'pipe' });
  } catch {
    console.error('AWS credentials missing or expired. Run: aws login');
    process.exit(1);
  }

  const bucket = tfOutput('frontend_bucket');
  const frontendUrl = tfOutput('frontend_url').replace(/\/$/, '');
  const apkUrl = `${frontendUrl}/${APK_KEY}`;

  console.log(`\n▶ Upload ${apkPath}`);
  console.log(`  → s3://${bucket}/${APK_KEY}`);
  execSync(
    `aws s3 cp "${apkPath}" "s3://${bucket}/${APK_KEY}" --content-type application/vnd.android.package-archive`,
    { cwd: root, stdio: 'inherit' },
  );

  const envProd = path.join(root, '.env.production');
  if (fs.existsSync(envProd)) {
    const lines = fs.readFileSync(envProd, 'utf8').split('\n');
    upsertEnvLine(lines, 'VITE_NATIVE_ANDROID_APK_URL', apkUrl);
    fs.writeFileSync(envProd, lines.filter((l, i, arr) => !(i === arr.length - 1 && l === '')).join('\n') + '\n');
    console.log(`✅ Updated .env.production → VITE_NATIVE_ANDROID_APK_URL=${apkUrl}`);
  } else {
    console.log(`Set in production build env: VITE_NATIVE_ANDROID_APK_URL=${apkUrl}`);
  }

  console.log('\n✅ Native APK published');
  console.log(`   Download URL: ${apkUrl}`);
  console.log('   Redeploy frontend so More → Install shows the link: npm run deploy:frontend');
}

main();