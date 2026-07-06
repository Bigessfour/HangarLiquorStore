import { InventoryCategory, INVENTORY_CATEGORIES } from '@/types/inventory';

export interface UpcLookupResult {
  name: string;
  category: InventoryCategory;
  packSize?: number;
  photo?: string; // URL to product image for live feel
}

const CACHE_KEY = 'hanger-upc-lookup-cache';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getCached(upc: string): UpcLookupResult | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    const entry = cache[upc];
    if (entry && Date.now() - entry._ts < CACHE_TTL_MS) {
      return { name: entry.name, category: entry.category, packSize: entry.packSize, photo: entry.photo };
    }
  } catch {}
  return null;
}

function setCached(upc: string, result: UpcLookupResult) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    cache[upc] = { ...result, _ts: Date.now() };
    // Prune old entries (keep last ~200)
    const entries = Object.entries(cache);
    if (entries.length > 200) {
      entries.sort((a: any, b: any) => b[1]._ts - a[1]._ts);
      const pruned: any = {};
      entries.slice(0, 200).forEach(([k, v]) => { pruned[k] = v; });
      localStorage.setItem(CACHE_KEY, JSON.stringify(pruned));
    } else {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    }
  } catch {}
}

function mapCategory(text: string): InventoryCategory {
  const lower = text.toLowerCase();
  if (/beer|ale|lager|stout|ipa/.test(lower)) return 'Beer';
  if (/whisk|whisky|bourbon|scotch|rum|vodka|gin|tequila|brandy|cognac|liqueur|spirits/.test(lower)) return 'Spirits';
  if (/wine|champagne|prosecco|port|sherry/.test(lower)) return 'Wine';
  if (/tonic|soda|juice|mixer|bitters|ginger/.test(lower)) return 'Mixers';
  return 'Spirits'; // liquor store default
}

function extractPackSize(text: string): number | undefined {
  const lower = text.toLowerCase();
  // Common patterns: "12pk", "12 pk", "12 pack", "12 count", "12 x 355ml", "12/12oz"
  const match = lower.match(/(\d+)\s*(?:pk|pack|ct|count|x|\s*\/\s*)/);
  if (match) {
    const n = parseInt(match[1], 10);
    if (n >= 2 && n <= 48) return n;
  }
  return undefined;
}

export async function lookupUpc(upc: string): Promise<UpcLookupResult | null> {
  const normalized = upc.replace(/\D/g, '');
  if (normalized.length < 8) return null;

  // 1. Check cache (free & fast)
  const cached = getCached(normalized);
  if (cached) return cached;

  if (!navigator.onLine) return null;

  try {
    // === Open Food Facts API (free, open data) - FALLBACK only ===
    // Primary product data comes from filtered OFF dump loaded into DynamoDB (HangerProducts table)
    // See scripts/filter-off-liquor-dump.ts and load-filtered-products-to-ddb.ts
    // This keeps AWS costs low: small DDB table (liquor only), GetItem lookups (cheap on-demand),
    // S3 for dump storage.
    //
    // Licensing (must comply):
    // - Database: Open Database License (ODbL 1.0)
    // - Contents: Database Contents License (DbCL 1.0)
    // - Images: CC BY-SA 3.0
    //
    // Requirements:
    // - 1 API call = 1 real user scan (we do this for fallback)
    // - Always send User-Agent (we do)
    // - Attribute Open Food Facts when displaying data
    // - Tell them about your reuse: reuse@openfoodfacts.org or https://forms.gle/hwaeqBfs8ywwhbTg8
    //
    // Recommended: Use full data exports (filtered to liquor) for bulk/offline, live API only for misses.
    // See https://world.openfoodfacts.org/data
    const url = `https://world.openfoodfacts.org/api/v2/product/${normalized}.json`;
    const res = await fetch(url, {
      headers: {
        // Required by Open Food Facts — identifies the app and allows them to contact us
        'User-Agent': 'HangerLiquorStore/1.0 (https://github.com/Bigessfour/HangarLiquorStore) - UPC lookup for inventory',
      },
    });
    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;

    const p = data.product;

    let name = (p.product_name || p.brands || p.generic_name || '').trim();
    if (!name) return null;

    // Improve name for liquor context
    if (p.brands && !name.includes(p.brands)) {
      name = `${p.brands} ${name}`.trim();
    }

    const packSize = extractPackSize(name) || extractPackSize(p.quantity || '') || undefined;

    // Build category text from multiple fields
    const catText = [
      p.categories || '',
      (p.categories_tags || []).join(' '),
      p.product_name || '',
      p.brands || '',
    ].join(' ');

    let category = mapCategory(catText);

    // Fallback for common liquor brands not perfectly tagged (liquor store bias)
    const nameLower = name.toLowerCase();
    if (!INVENTORY_CATEGORIES.includes(category as any)) {
      if (/beer|light|lager/.test(nameLower)) category = 'Beer';
      else if (/jack|daniel|jim beam|wild turkey|maker|glen|chivas|absolut|smirnoff|grey goose|bacardi|captain morgan|patron|don julio/.test(nameLower)) category = 'Spirits';
      else if (/wine|merlot|cabernet|pinot|chardonnay|malbec/.test(nameLower)) category = 'Wine';
      else if (/tonic|club soda|ginger ale|bitters/.test(nameLower)) category = 'Mixers';
      else category = 'Spirits';
    }

    // Live photo from Open Food Facts (free)
    const photo = p.image_front_url || p.image_url || p.image_small_url || undefined;

    const result: UpcLookupResult = {
      name: name.substring(0, 180), // safety
      category: category as InventoryCategory,
      packSize,
      photo,
    };

    setCached(normalized, result);
    return result;
  } catch (e) {
    // Network error, rate limit, etc. - fail silently to manual entry
    console.warn('UPC lookup failed (free tier):', e);
    return null;
  }
}

/**
 * IMPORTANT - Open Food Facts Licensing & Compliance (as of 2026)
 *
 * We are using the live product API for on-demand lookups (1 call = 1 real user scan).
 * This is explicitly allowed and encouraged by Open Food Facts.
 *
 * Licenses:
 * - Database: Open Database License (ODbL 1.0) https://opendatacommons.org/licenses/odbl/1.0/
 * - Contents: Database Contents License (DbCL 1.0)
 * - Images: Creative Commons Attribution-ShareAlike 3.0 (CC BY-SA 3.0)
 *
 * Requirements we must follow:
 * 1. Proper User-Agent header (we send one with app name + GitHub link)
 * 2. Attribute Open Food Facts when displaying data or images
 * 3. Do NOT use the API for bulk scraping (we don't — only per-user scan)
 * 4. Ideally notify them of re-use: reuse@openfoodfacts.org or the form at https://forms.gle/hwaeqBfs8ywwhbTg8
 *
 * Recommended attribution text (use in UI):
 *   "Product data from Open Food Facts (openfoodfacts.org) — CC BY-SA"
 *
 * Full data dumps (for offline bulk use) are available at:
 *   https://world.openfoodfacts.org/data
 *
 * See also: https://world.openfoodfacts.org/terms-of-use
 */

// For future: could add a paid low-cost fallback (e.g. Go-UPC trial) behind a flag
// but this keeps everything free by default.
