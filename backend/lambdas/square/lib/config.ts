export const SQUARE_API_VERSION = '2025-04-16';

export function squareConnectBase(): string {
  const sandbox = process.env.SQUARE_SANDBOX === 'true';
  return sandbox ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com';
}

export function squareApiBase(): string {
  const sandbox = process.env.SQUARE_SANDBOX === 'true';
  return sandbox ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com';
}

export function ssmPrefix(): string {
  return process.env.SQUARE_SSM_PREFIX || '/hanger/prod/square';
}

export function connectionTable(): string {
  return process.env.SQUARE_CONNECTION_TABLE || 'HangerSquareConnection';
}

export function storeId(): string {
  return process.env.STORE_ID || 'hanger';
}

export function redirectUri(): string {
  return process.env.SQUARE_REDIRECT_URI || '';
}

export function frontendUrl(): string {
  return (process.env.FRONTEND_URL || '').replace(/\/$/, '');
}

/** Read-only scopes for POS sales → forecasting (no write access). */
export const SQUARE_OAUTH_SCOPES = [
  'MERCHANT_PROFILE_READ',
  'ORDERS_READ',
  'PAYMENTS_READ',
  'ITEMS_READ',
  'INVENTORY_READ',
] as const;