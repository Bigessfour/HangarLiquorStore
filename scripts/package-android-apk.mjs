#!/usr/bin/env node
/**
 * Build unsigned Android APK via PWABuilder (no Play Store).
 * Requires a public HTTPS URL with a valid web manifest.
 *
 * Usage:
 *   npm run build && npm run deploy:frontend   # or your CloudFront URL
 *   npm run package:android -- https://YOUR-CLOUDFRONT.cloudfront.net
 *
 * Output: dist/mobile/hanger-liquor-android.zip (contains .apk for sideload)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const APK_API = 'https://pwabuilder-cloudapk.azurewebsites.net/generateAppPackage';

function argUrl() {
  const url = process.argv[2] || process.env.PWA_URL || process.env.VITE_PWA_URL;
  if (!url) {
    console.error('Usage: npm run package:android -- https://your-public-https-url');
    console.error('  (App must be deployed and manifest reachable)');
    process.exit(1);
  }
  return url.replace(/\/$/, '');
}

async function fetchManifest(baseUrl) {
  for (const path of ['/manifest.webmanifest', '/manifest.json']) {
    const res = await fetch(`${baseUrl}${path}`);
    if (res.ok) return { manifest: await res.json(), manifestUrl: `${baseUrl}${path}` };
  }
  throw new Error(`No manifest found at ${baseUrl}`);
}

async function main() {
  const host = argUrl();
  console.log(`Packaging Android APK for ${host} via PWABuilder…`);

  const { manifest, manifestUrl } = await fetchManifest(host);
  const icon =
    manifest.icons?.find((i) => i.sizes === '512x512')?.src ||
    manifest.icons?.[manifest.icons.length - 1]?.src;
  const iconUrl = icon?.startsWith('http') ? icon : `${host}${icon?.startsWith('/') ? '' : '/'}${icon}`;

  const body = {
    additionalTrustedOrigins: [],
    appVersion: '1.0.0.0',
    appVersionCode: 1,
    backgroundColor: manifest.background_color || '#1e2937',
    display: manifest.display || 'standalone',
    enableNotifications: false,
    enableSiteSettingsShortcut: true,
    fallbackType: 'customtabs',
    features: { locationDelegation: { enabled: true }, playBilling: { enabled: false } },
    host,
    iconUrl,
    includeSourceCode: true,
    isChromeOSOnly: false,
    launcherName: manifest.short_name || 'Hanger',
    maskableIconUrl: manifest.icons?.find((i) => i.purpose?.includes('maskable'))?.src
      ? `${host}${manifest.icons.find((i) => i.purpose?.includes('maskable')).src}`
      : iconUrl,
    name: manifest.name || 'Hanger Liquor Store',
    navigationColor: manifest.theme_color || '#d97706',
    navigationColorDark: manifest.theme_color || '#d97706',
    navigationDividerColor: manifest.theme_color || '#d97706',
    navigationDividerColorDark: manifest.theme_color || '#d97706',
    orientation: manifest.orientation || 'portrait-primary',
    packageId: 'com.hangerliquor.store',
    serviceAccountJsonFile: null,
    shareTarget: null,
    shortcuts: [],
    signing: null,
    signingMode: 'none',
    splashScreenFadeOutDuration: 300,
    startUrl: manifest.start_url?.startsWith('http') ? new URL(manifest.start_url).pathname : manifest.start_url || '/',
    themeColor: manifest.theme_color || '#d97706',
    themeColorDark: '#1e2937',
    webManifestUrl: manifestUrl,
  };

  const res = await fetch(APK_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PWABuilder APK API ${res.status}: ${text.slice(0, 500)}`);
  }

  const outDir = path.join(root, 'dist/mobile');
  fs.mkdirSync(outDir, { recursive: true });
  const zipPath = path.join(outDir, 'hanger-liquor-android.zip');
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(zipPath, buffer);

  console.log(`\n✅ Android package saved: ${zipPath}`);
  console.log('Unzip → install the .apk on Android (enable "Install unknown apps" for your browser/files app).');
  console.log('No Google Play or App Store required.');
  console.log(`\nPWABuilder web UI (optional): https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(host)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});