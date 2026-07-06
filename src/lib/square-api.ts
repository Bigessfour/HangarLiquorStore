import { apiClient } from '@/lib/api-client';

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

export async function fetchSquareStatus(): Promise<SquareConnectionStatus> {
  return apiClient<SquareConnectionStatus>('/api/square/status');
}

export async function startSquareAuthorization(): Promise<string> {
  const res = await apiClient<{ authorizationUrl: string }>('/api/square/authorize');
  return res.authorizationUrl;
}

export async function disconnectSquare(): Promise<void> {
  await apiClient('/api/square/disconnect', { method: 'POST' });
}