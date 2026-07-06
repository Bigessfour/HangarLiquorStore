#!/usr/bin/env node
/**
 * Build Capacitor Android debug APK with native ML Kit barcode scanning.
 *
 * Prerequisites: JDK 17+, Android SDK (Android Studio or command-line tools).
 *
 * Usage:
 *   npm run build:android          # debug APK
 *   npm run build:android:release  # release APK (unsigned until keystore configured)
 *
 * Output: android/app/build/outputs/apk/
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const isRelease = process.argv.includes('--release');

function run(cmd, args, cwd = root) {
  console.log(`\n▶ ${cmd} ${args.join(' ')}`);
  const result = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run('npm', ['run', 'build']);
run('npx', ['cap', 'sync', 'android']);

const gradleTask = isRelease ? 'assembleRelease' : 'assembleDebug';
const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
run(gradlew, [gradleTask], path.join(root, 'android'));

const variant = isRelease ? 'release' : 'debug';
const apkDir = path.join(root, 'android', 'app', 'build', 'outputs', 'apk', variant);
console.log(`\n✅ APK built: ${apkDir}`);
console.log('   Upload to S3/CloudFront and set VITE_NATIVE_ANDROID_APK_URL for More → Install.');