import { apiClient } from '@/lib/api-client';
import { isMockApi } from '@/lib/mock-api';

export interface SquareConnectionStatus {
  credentialsConfigured: boolean;
  connected: boolean;
  merchantName: string | null;
  merchantId: string | null;
  locationName: string | null;
  locationId: string | null;
  connectedAt: string | null;
  connectedBy: string | null;
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
  scopes: [],
};

export async function fetchSquareStatus(): Promise<SquareConnectionStatus> {
  if (isMockApi()) {
    return MOCK_SQUARE_STATUS;
  }
  return apiClient<SquareConnectionStatus>('/api/square/status');
}

export async function startSquareAuthorization(): Promise<string> {
  if (isMockApi()) {
    throw new Error('Square OAuth requires a live API. Run against deployed backend, not mock demo.');
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
