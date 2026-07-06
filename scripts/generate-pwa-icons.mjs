#!/usr/bin/env node
/**
 * Generate PWA icons required by PWABuilder, iOS, and Android install.
 * Requires: npm install sharp (devDependency)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '../public');

const ICON_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#1e2937"/>
  <rect x="96" y="88" width="320" height="280" rx="40" fill="#d97706"/>
  <rect x="176" y="48" width="160" height="56" rx="16" fill="#eab308"/>
  <text x="256" y="280" text-anchor="middle" fill="#1e2937" font-family="system-ui,sans-serif" font-size="120" font-weight="800">H</text>
  <text x="256" y="400" text-anchor="middle" fill="#f8fafc" font-family="system-ui,sans-serif" font-size="36" font-weight="600">LIQUOR</text>
</svg>`;

async function main() {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.error('Install sharp first: npm install sharp --save-dev');
    process.exit(1);
  }

  const svgBuffer = Buffer.from(ICON_SVG);
  const sizes = [
    { name: 'icon-192.png', size: 192, maskable: false },
    { name: 'icon-512.png', size: 512, maskable: false },
    { name: 'icon-512-maskable.png', size: 512, maskable: true },
    { name: 'apple-touch-icon.png', size: 180, maskable: false },
  ];

  for (const { name, size, maskable } of sizes) {
    let pipeline = sharp(svgBuffer).resize(size, size, { fit: 'contain', background: '#1e2937' });
    if (maskable) {
      pipeline = pipeline.extend({
        top: Math.round(size * 0.1),
        bottom: Math.round(size * 0.1),
        left: Math.round(size * 0.1),
        right: Math.round(size * 0.1),
        background: '#1e2937',
      });
    }
    await pipeline.png().toFile(path.join(publicDir, name));
    console.log(`Wrote public/${name}`);
  }

  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), await sharp(svgBuffer).resize(32, 32).png().toBuffer());
  console.log('Wrote public/favicon.ico');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});