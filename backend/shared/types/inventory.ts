export const INVENTORY_CATEGORIES = ['Beer', 'Spirits', 'Wine', 'Mixers'] as const;

export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number];

export interface InventoryRecord {
  upc: string;
  name: string;
  category: InventoryCategory;
  currentStock: number;
  reorderPoint?: number;
  updatedAt?: string;
}

export interface CreateInventoryInput {
  upc: string;
  name: string;
  category: InventoryCategory;
  quantity: number;
  reorderPoint?: number;
}

export interface UpdateInventoryInput {
  upc: string;
  name?: string;
  category?: InventoryCategory;
  currentStock?: number;
  reorderPoint?: number;
}

export interface ScanInventoryInput {
  upc: string;
  delta: number;
}

export interface CsvImportRow {
  upc: string;
  name: string;
  category: InventoryCategory;
  currentStock: number;
  reorderPoint?: number;
}

export interface QueuedSyncAction {
  id: string;
  type: 'add' | 'adjust' | 'sale';
  payload: {
    upc: string;
    delta?: number;
    quantity?: number;
    name?: string;
    category?: InventoryCategory;
    productName?: string;
  };
  timestamp: number;
}
