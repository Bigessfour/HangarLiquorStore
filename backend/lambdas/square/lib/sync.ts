import { syncCatalog } from './catalog-sync';
import { syncInventory } from './inventory-sync';
import { syncOrders } from './orders-sync';
import { syncPayments } from './payments-sync';
import { fetchLocations, getValidAccessToken } from './oauth';
import { getConnection, saveConnection } from './storage';
import { storeId } from './config';

export interface SquareSyncSummary {
  startedAt: string;
  finishedAt: string;
  lookbackDays: number;
  catalog: { productsUpserted: number; mappedVariations: number };
  orders: {
    ordersProcessed: number;
    salesRowsWritten: number;
    unmappedLineItems: number;
    unitsSold: number;
    staleRowsCleared?: number;
  };
  inventory: {
    countsRead: number;
    inventoryUpdated: number;
    skippedUnmapped: number;
  };
  payments: {
    paymentsRead: number;
    paymentsGrossCents: number;
    paymentsCurrency: string;
  };
  source: 'manual' | 'scheduled';
}

export async function runSquareSync(opts?: {
  lookbackDays?: number;
  source?: 'manual' | 'scheduled';
}): Promise<SquareSyncSummary | { skipped: true; reason: string }> {
  const lookbackDays = opts?.lookbackDays ?? 90;
  const source = opts?.source ?? 'manual';
  const startedAt = new Date().toISOString();

  const connection = await getConnection();
  if (!connection?.connected) {
    return { skipped: true, reason: 'Square is not connected' };
  }

  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return { skipped: true, reason: 'Square access token missing' };
  }

  const locations = await fetchLocations(accessToken);
  const locationIds = locations.map((l) => l.id).filter(Boolean);
  if (locationIds.length === 0) {
    throw new Error('No Square locations available for sync');
  }

  const catalog = await syncCatalog(accessToken);
  const orders = await syncOrders(accessToken, locationIds, catalog, lookbackDays);
  const inventory = await syncInventory(accessToken, locationIds, catalog);
  const payments = await syncPayments(
    accessToken,
    connection.locationId || locationIds[0],
    lookbackDays,
  );

  const finishedAt = new Date().toISOString();
  const summary: SquareSyncSummary = {
    startedAt,
    finishedAt,
    lookbackDays,
    catalog: {
      productsUpserted: catalog.productsUpserted,
      mappedVariations: catalog.variationToUpc.size,
    },
    orders,
    inventory,
    payments,
    source,
  };

  await saveConnection({
    ...connection,
    storeId: storeId(),
    lastSyncAt: finishedAt,
    lastSyncSummary: summary,
  });

  return summary;
}
