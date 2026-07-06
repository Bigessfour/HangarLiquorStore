import catalog from '../../shared/product-catalog.json';
import type { InventoryCategory } from '@/types/inventory';

export interface ProductCatalogEntry {
  upc: string;
  name: string;
  category: InventoryCategory;
  packSize: number;
  photo?: string;
  brands?: string;
}

const ENTRIES = catalog as ProductCatalogEntry[];

const byUpc = new Map(ENTRIES.map((item) => [item.upc, item]));

/** Demo + AWS product catalog (HangerProducts table uses the same records). */
export function getCatalogProduct(upc: string): ProductCatalogEntry | null {
  const normalized = upc.replace(/\D/g, '');
  return byUpc.get(normalized) ?? null;
}

export function listCatalogProducts(): ProductCatalogEntry[] {
  return [...ENTRIES];
}