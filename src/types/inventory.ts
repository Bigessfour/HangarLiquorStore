import { z } from 'zod';

export const INVENTORY_CATEGORIES = ['Beer', 'Spirits', 'Wine', 'Mixers'] as const;

export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number];

export const inventoryCategorySchema = z.enum(INVENTORY_CATEGORIES);

export const inventoryItemSchema = z.object({
  upc: z
    .string()
    .min(8, 'UPC must be at least 8 digits')
    .max(14, 'UPC must be at most 14 digits')
    .regex(/^\d+$/, 'UPC must contain only digits'),
  name: z.string().min(1, 'Name is required').max(200),
  category: inventoryCategorySchema,
  currentStock: z.number().int().min(0, 'Stock cannot be negative'),
  reorderPoint: z.number().int().min(0).optional(),
  updatedAt: z.string().optional(),
  packSize: z.number().int().min(1).optional().default(1), // case-break support: 12 for 12pk, 1 for single bottle
  photo: z.string().optional(), // base64 data URL or http URL from camera or OFF lookup
});

export type InventoryItem = z.infer<typeof inventoryItemSchema>;

export const scanAddItemSchema = z.object({
  upc: z
    .string()
    .min(8, 'UPC must be at least 8 digits')
    .max(14, 'UPC must be at most 14 digits')
    .regex(/^\d+$/, 'UPC must contain only digits'),
  name: z.string().min(1, 'Name is required').max(200),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  category: inventoryCategorySchema.default('Beer'),
  packSize: z.coerce.number().int().min(1).optional().default(1), // for case-break (e.g. qty=1 but packSize=12 means +12 units)
  photo: z.string().optional(), // optional photo captured or from lookup
});

export type ScanAddItemInput = z.infer<typeof scanAddItemSchema>;

export const inventoryUpdateSchema = inventoryItemSchema.partial().required({ upc: true });

export type InventoryUpdateInput = z.infer<typeof inventoryUpdateSchema>;

export const csvImportRowSchema = z.object({
  upc: z.string().min(8).max(14),
  name: z.string().min(1),
  category: inventoryCategorySchema,
  currentStock: z.coerce.number().int().min(0),
  reorderPoint: z.coerce.number().int().min(0).optional(),
  packSize: z.coerce.number().int().min(1).optional().default(1),
  photo: z.string().optional(),
});

export type CsvImportRow = z.infer<typeof csvImportRowSchema>;

export const csvImportSchema = z.array(csvImportRowSchema).min(1, 'At least one row required');

export interface ScanResult {
  upc: string;
  matchedItem?: InventoryItem;
  isNew: boolean;
}

// HangerItem: lightweight view model for dashboard/scan displays (Phase 2/3)
export interface HangerItem {
  upc: string;
  name: string; // e.g. "Bud Light 12pk"
  stock: number;
  packSize?: number; // 12 = case, 1 = single (case-break)
  lastSold: string;
  forecast: string; // "4th July" | "REORDER NOW" | "Rodeo Weekend"
  category: 'Beer' | 'Whiskey' | 'Vodka' | 'Spirits' | 'Wine' | 'Mixers';
}

export interface InventoryListParams {
  search?: string;
  category?: InventoryCategory | 'All';
}
