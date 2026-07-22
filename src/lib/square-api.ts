import { apiClient } from '@/lib/api-client';
import { isDemoSquareSimulated } from '@/lib/demo-sim';
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
  /** True when status is from VITE_DEMO_SIMULATE_SQUARE, not live OAuth */
  demoSimulation?: boolean;
}

const MOCK_SQUARE_STATUS_DISCONNECTED: SquareConnectionStatus = {
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
  demoSimulation: false,
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

const DEMO_SYNC_KEY = 'hanger-demo-square-last-sync';

function buildSimulatedSquareStatus(): SquareConnectionStatus {
  const lastSyncAt =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem(DEMO_SYNC_KEY) ?? new Date(Date.now() - 3_600_000).toISOString()
      : new Date(Date.now() - 3_600_000).toISOString();

  return {
    credentialsConfigured: true,
    connected: true,
    merchantName: 'Hangar Liquor (demo simulation)',
    merchantId: 'DEMO_MERCHANT',
    locationName: 'Wiley Main (simulated)',
    locationId: 'DEMO_LOCATION',
    connectedAt: new Date(Date.now() - 86_400_000 * 7).toISOString(),
    connectedBy: 'demo-owner',
    lastSyncAt,
    lastSyncSummary: {
      ...MOCK_SYNC_SUMMARY,
      startedAt: lastSyncAt,
      finishedAt: lastSyncAt,
      source: 'manual',
    },
    scopes: [
      'MERCHANT_PROFILE_READ',
      'ITEMS_READ',
      'ORDERS_READ',
      'INVENTORY_READ',
      'PAYMENTS_READ',
    ],
    demoSimulation: true,
  };
}

function mockSquareStatus(): SquareConnectionStatus {
  if (isDemoSquareSimulated()) {
    return buildSimulatedSquareStatus();
  }
  return MOCK_SQUARE_STATUS_DISCONNECTED;
}

export async function fetchSquareStatus(): Promise<SquareConnectionStatus> {
  if (isMockApi()) {
    return mockSquareStatus();
  }
  return apiClient<SquareConnectionStatus>('/api/square/status');
}

export async function startSquareAuthorization(): Promise<string> {
  if (isMockApi()) {
    if (isDemoSquareSimulated()) {
      throw new Error(
        'This demo already simulates a connected Square account. Real Connect needs a live API + Owner OAuth (docs/square-owner-setup.md).',
      );
    }
    throw new Error(
      'Square OAuth requires a live API. Run against deployed backend, not mock demo.',
    );
  }
  const res = await apiClient<{ authorizationUrl: string }>('/api/square/authorize');
  return res.authorizationUrl;
}

export async function disconnectSquare(): Promise<void> {
  if (isMockApi()) {
    if (isDemoSquareSimulated()) {
      throw new Error(
        'Demo simulation stays “connected” while VITE_DEMO_SIMULATE_SQUARE=true. Turn the flag off in .env.demo to show the disconnected state.',
      );
    }
    return;
  }
  await apiClient('/api/square/disconnect', { method: 'POST' });
}

export async function syncSquareData(): Promise<SquareSyncSummary> {
  if (isMockApi()) {
    const now = new Date().toISOString();
    if (typeof localStorage !== 'undefined' && isDemoSquareSimulated()) {
      localStorage.setItem(DEMO_SYNC_KEY, now);
    }
    return {
      ...MOCK_SYNC_SUMMARY,
      startedAt: now,
      finishedAt: now,
    };
  }
  return apiClient<SquareSyncSummary>('/api/square/sync', { method: 'POST' });
}
