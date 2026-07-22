import { squareFetch } from './client';
import { upsertProductFromSquare } from './hangar-writes';

export interface CatalogUpcMap {
  /** catalog_object_id (variation) → upc */
  variationToUpc: Map<string, string>;
  /** upc → display name */
  upcToName: Map<string, string>;
  productsUpserted: number;
}

type CatalogObject = {
  type?: string;
  id?: string;
  item_data?: {
    name?: string;
    category_id?: string;
    variations?: CatalogObject[];
  };
  item_variation_data?: {
    name?: string;
    upc?: string;
    sku?: string;
    item_id?: string;
  };
};

function extractUpc(variation: CatalogObject): string | null {
  const data = variation.item_variation_data;
  if (!data) return null;
  const upc = (data.upc || data.sku || '').replace(/\D/g, '');
  if (upc.length >= 8) return upc;
  if (data.upc && data.upc.trim().length >= 8) return data.upc.trim();
  return null;
}

export async function syncCatalog(accessToken: string): Promise<CatalogUpcMap> {
  const variationToUpc = new Map<string, string>();
  const upcToName = new Map<string, string>();
  let productsUpserted = 0;
  let cursor: string | undefined;

  do {
    const qs = new URLSearchParams({ types: 'ITEM,ITEM_VARIATION' });
    if (cursor) qs.set('cursor', cursor);

    const page = await squareFetch<{
      objects?: CatalogObject[];
      cursor?: string;
    }>(accessToken, `/v2/catalog/list?${qs.toString()}`);

    const objects = page.objects ?? [];
    const itemsById = new Map<string, CatalogObject>();
    for (const obj of objects) {
      if (obj.type === 'ITEM' && obj.id) itemsById.set(obj.id, obj);
    }

    for (const obj of objects) {
      if (obj.type !== 'ITEM_VARIATION' || !obj.id) continue;
      const upc = extractUpc(obj);
      if (!upc) continue;

      const parent = obj.item_variation_data?.item_id
        ? itemsById.get(obj.item_variation_data.item_id)
        : undefined;
      const parentName = parent?.item_data?.name || 'Square item';
      const variationName = obj.item_variation_data?.name;
      const name =
        variationName && variationName !== 'Regular'
          ? `${parentName} — ${variationName}`
          : parentName;

      variationToUpc.set(obj.id, upc);
      upcToName.set(upc, name);

      await upsertProductFromSquare({
        upc,
        name,
        squareCatalogObjectId: obj.item_variation_data?.item_id,
        squareVariationId: obj.id,
      });
      productsUpserted += 1;
    }

    // Nested variations on ITEM objects (list sometimes nests)
    for (const item of itemsById.values()) {
      for (const variation of item.item_data?.variations ?? []) {
        if (!variation.id) continue;
        const upc = extractUpc(variation);
        if (!upc) continue;
        const parentName = item.item_data?.name || 'Square item';
        const variationName = variation.item_variation_data?.name;
        const name =
          variationName && variationName !== 'Regular'
            ? `${parentName} — ${variationName}`
            : parentName;
        variationToUpc.set(variation.id, upc);
        upcToName.set(upc, name);
        await upsertProductFromSquare({
          upc,
          name,
          squareCatalogObjectId: item.id,
          squareVariationId: variation.id,
        });
        productsUpserted += 1;
      }
    }

    cursor = page.cursor;
  } while (cursor);

  return { variationToUpc, upcToName, productsUpserted };
}
