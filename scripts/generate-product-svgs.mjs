#!/usr/bin/env node
/**
 * Generate self-hosted product thumbnails for laptop demo (always load, no CDN).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(
  fs.readFileSync(path.join(root, 'shared/product-catalog.json'), 'utf8'),
);
const outDir = path.join(root, 'public/products');
fs.mkdirSync(outDir, { recursive: true });

const CATEGORY_COLORS = {
  Beer: { bg: '#1e3a5f', accent: '#eab308' },
  Spirits: { bg: '#3f1f1f', accent: '#d97706' },
  Wine: { bg: '#3b1f3b', accent: '#a855f7' },
  Mixers: { bg: '#1f3f2f', accent: '#22c55e' },
};

function escapeXml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function wrapLines(text, max = 18) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

for (const item of catalog) {
  const colors = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Beer;
  const lines = wrapLines(item.name);
  const tspans = lines
    .map((l, i) => `<tspan x="100" dy="${i === 0 ? 0 : 16}">${escapeXml(l)}</tspan>`)
    .join('');
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200" role="img" aria-label="${escapeXml(item.name)}">
  <rect width="200" height="200" rx="16" fill="${colors.bg}"/>
  <rect x="60" y="28" width="80" height="72" rx="10" fill="${colors.accent}" opacity="0.9"/>
  <rect x="72" y="18" width="56" height="14" rx="4" fill="${colors.accent}"/>
  <text x="100" y="128" text-anchor="middle" fill="#f8fafc" font-family="system-ui,sans-serif" font-size="11" font-weight="600">${tspans}</text>
  <text x="100" y="168" text-anchor="middle" fill="${colors.accent}" font-family="system-ui,sans-serif" font-size="10" font-weight="700">${escapeXml(item.category)}</text>
  <text x="100" y="186" text-anchor="middle" fill="#94a3b8" font-family="ui-monospace,monospace" font-size="9">${escapeXml(item.upc)}</text>
</svg>`;
  fs.writeFileSync(path.join(outDir, `${item.upc}.svg`), svg);
  console.log(`Wrote ${item.upc}.svg`);
}

console.log(`Done — ${catalog.length} product images in public/products/`);