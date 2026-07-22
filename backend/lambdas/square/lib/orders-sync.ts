import { squareFetch } from './client';
import { clearStaleSquareSales, putSalesQuantity } from './hangar-writes';
import type { CatalogUpcMap } from './catalog-sync';

export interface OrdersSyncResult {
  ordersProcessed: number;
  salesRowsWritten: number;
  unmappedLineItems: number;
  unitsSold: number;
  staleRowsCleared: number;
}

type OrderLineItem = {
  catalog_object_id?: string;
  quantity?: string;
  name?: string;
  item_type?: string;
};

type Order = {
  id?: string;
  created_at?: string;
  state?: string;
  line_items?: OrderLineItem[];
};

/** Bucket Square timestamps to America/Denver calendar date (Hangar Liquor store TZ). */
function toStoreDateKey(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Denver',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export async function syncOrders(
  accessToken: string,
  locationIds: string[],
  catalog: CatalogUpcMap,
  lookbackDays = 90,
): Promise<OrdersSyncResult> {
  const end = new Date();
  const start = new Date(end.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
  const startDate = toStoreDateKey(start.toISOString());
  const endDate = toStoreDateKey(end.toISOString());

  /** upc|date → quantity */
  const aggregates = new Map<string, number>();
  let ordersProcessed = 0;
  let unmappedLineItems = 0;
  let cursor: string | undefined;

  do {
    const body: Record<string, unknown> = {
      location_ids: locationIds,
      query: {
        filter: {
          date_time_filter: {
            created_at: {
              start_at: start.toISOString(),
              end_at: end.toISOString(),
            },
          },
          state_filter: {
            states: ['COMPLETED'],
          },
        },
        sort: {
          sort_field: 'CREATED_AT',
          sort_order: 'DESC',
        },
      },
      limit: 100,
    };
    if (cursor) body.cursor = cursor;

    const page = await squareFetch<{
      orders?: Order[];
      cursor?: string;
    }>(accessToken, '/v2/orders/search', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    for (const order of page.orders ?? []) {
      ordersProcessed += 1;
      const date = order.created_at ? toStoreDateKey(order.created_at) : null;
      if (!date) continue;

      for (const line of order.line_items ?? []) {
        const qty = Math.max(0, Math.round(Number(line.quantity || 0)));
        if (qty <= 0) continue;

        const catalogId = line.catalog_object_id;
        const upc = catalogId ? catalog.variationToUpc.get(catalogId) : undefined;
        if (!upc) {
          unmappedLineItems += 1;
          continue;
        }

        const key = `${upc}|${date}`;
        aggregates.set(key, (aggregates.get(key) ?? 0) + qty);
      }
    }

    cursor = page.cursor;
  } while (cursor);

  let salesRowsWritten = 0;
  let unitsSold = 0;
  const keepKeys = new Set<string>();
  for (const [key, quantity] of aggregates) {
    const [upc, date] = key.split('|');
    keepKeys.add(key);
    await putSalesQuantity(upc, date, quantity);
    salesRowsWritten += 1;
    unitsSold += quantity;
  }

  const staleRowsCleared = await clearStaleSquareSales(keepKeys, startDate, endDate);

  return {
    ordersProcessed,
    salesRowsWritten,
    unmappedLineItems,
    unitsSold,
    staleRowsCleared,
  };
}
