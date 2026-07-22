import { squareFetch } from './client';
import { updateInventoryStockIfExists } from './hangar-writes';
import type { CatalogUpcMap } from './catalog-sync';

export interface InventorySyncResult {
  countsRead: number;
  inventoryUpdated: number;
  skippedUnmapped: number;
}

export async function syncInventory(
  accessToken: string,
  locationIds: string[],
  catalog: CatalogUpcMap,
): Promise<InventorySyncResult> {
  const variationIds = Array.from(catalog.variationToUpc.keys());
  let countsRead = 0;
  let inventoryUpdated = 0;
  let skippedUnmapped = 0;

  // Batch retrieve in chunks of 100
  for (let i = 0; i < variationIds.length; i += 100) {
    const chunk = variationIds.slice(i, i + 100);
    if (chunk.length === 0) continue;

    const page = await squareFetch<{
      counts?: Array<{
        catalog_object_id?: string;
        quantity?: string;
        location_id?: string;
      }>;
    }>(accessToken, '/v2/inventory/counts/batch-retrieve', {
      method: 'POST',
      body: JSON.stringify({
        catalog_object_ids: chunk,
        location_ids: locationIds,
      }),
    });

    /** upc → summed quantity across locations */
    const byUpc = new Map<string, number>();
    for (const count of page.counts ?? []) {
      countsRead += 1;
      const upc = count.catalog_object_id
        ? catalog.variationToUpc.get(count.catalog_object_id)
        : undefined;
      if (!upc) {
        skippedUnmapped += 1;
        continue;
      }
      const qty = Number(count.quantity || 0);
      byUpc.set(upc, (byUpc.get(upc) ?? 0) + qty);
    }

    for (const [upc, stock] of byUpc) {
      const updated = await updateInventoryStockIfExists(upc, stock);
      if (updated) inventoryUpdated += 1;
    }
  }

  return { countsRead, inventoryUpdated, skippedUnmapped };
}
