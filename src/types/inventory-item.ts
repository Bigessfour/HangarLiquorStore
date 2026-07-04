export interface InventoryItem {
  upc: string;
  name: string;
  category: string;
  currentStock: number;
  reorderPoint?: number;
}