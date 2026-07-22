import { apiClient } from '@/lib/api-client';
import { isMockApi } from '@/lib/mock-api';

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

export interface SquareConnectionStatus {
  credentialsConfigured: boolean;
  connected: boolean;
  merchantName: string | null;
  merchantId: string | null;
  locationName: string | null;
  locationId: string | null;
  connectedAt: string | null;
  connectedBy: string | null;
  lastSyncAt: string | null;
  lastSyncSummary: SquareSyncSummary | null;
  scopes: string[];
}

const MOCK_SQUARE_STATUS: SquareConnectionStatus = {
  credentialsConfigured: false,
  connected: false,
  merchantName: null,
  merchantId: null,
  locationName: null,
  locationId: null,
  connectedAt: null,
  connectedBy: null,
  lastSyncAt: null,
  lastSyncSummary: null,
  scopes: [],
};

const MOCK_SYNC_SUMMARY: SquareSyncSummary = {
  startedAt: new Date().toISOString(),
  finishedAt: new Date().toISOString(),
  lookbackDays: 90,
  catalog: { productsUpserted: 12, mappedVariations: 12 },
  orders: {
    ordersProcessed: 48,
    salesRowsWritten: 36,
    unmappedLineItems: 2,
    unitsSold: 210,
    staleRowsCleared: 0,
  },
  inventory: { countsRead: 12, inventoryUpdated: 8, skippedUnmapped: 0 },
  payments: {
    paymentsRead: 40,
    paymentsGrossCents: 425000,
    paymentsCurrency: 'USD',
  },
  source: 'manual',
};

export async function fetchSquareStatus(): Promise<SquareConnectionStatus> {
  if (isMockApi()) {
    return MOCK_SQUARE_STATUS;
  }
  return apiClient<SquareConnectionStatus>('/api/square/status');
}

export async function startSquareAuthorization(): Promise<string> {
  if (isMockApi()) {
    throw new Error(
      'Square OAuth requires a live API. Run against deployed backend, not mock demo.',
    );
  }
  const res = await apiClient<{ authorizationUrl: string }>('/api/square/authorize');
  return res.authorizationUrl;
}

export async function disconnectSquare(): Promise<void> {
  if (isMockApi()) {
    return;
  }
  await apiClient('/api/square/disconnect', { method: 'POST' });
}

export async function syncSquareData(): Promise<SquareSyncSummary> {
  if (isMockApi()) {
    return {
      ...MOCK_SYNC_SUMMARY,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
    };
  }
  return apiClient<SquareSyncSummary>('/api/square/sync', { method: 'POST' });
}
