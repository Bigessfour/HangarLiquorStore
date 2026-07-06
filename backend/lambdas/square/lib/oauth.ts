import { randomBytes } from 'node:crypto';
import {
  SQUARE_OAUTH_SCOPES,
  squareApiBase,
  squareConnectBase,
  redirectUri,
} from './config';
import { getSquareAppCredentials, saveSquareTokens } from './storage';

export async function buildAuthorizationUrlAsync(state: string): Promise<string | null> {
  const creds = await getSquareAppCredentials();
  if (!creds) return null;
  return buildAuthorizationUrlWithId(creds.applicationId, state);
}

function buildAuthorizationUrlWithId(applicationId: string, state: string): string {
  const scope = SQUARE_OAUTH_SCOPES.join('+');
  const redirect = encodeURIComponent(redirectUri());
  return (
    `${squareConnectBase()}/oauth2/authorize` +
    `?client_id=${encodeURIComponent(applicationId)}` +
    `&scope=${scope}` +
    `&state=${encodeURIComponent(state)}` +
    '&session=false'
  );
}

export function newOAuthState(): string {
  return randomBytes(24).toString('hex');
}

export async function exchangeAuthorizationCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  merchantId?: string;
}> {
  const creds = await getSquareAppCredentials();
  if (!creds) throw new Error('Square application credentials are not configured');

  const res = await fetch(`${squareConnectBase()}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Square-Version': '2025-04-16' },
    body: JSON.stringify({
      client_id: creds.applicationId,
      client_secret: creds.applicationSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri(),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Square token exchange failed: ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    merchant_id?: string;
  };

  await saveSquareTokens(data.access_token, data.refresh_token);

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    merchantId: data.merchant_id,
  };
}

export async function revokeSquareTokens(accessToken: string): Promise<void> {
  const creds = await getSquareAppCredentials();
  if (!creds) return;

  await fetch(`${squareConnectBase()}/oauth2/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Square-Version': '2025-04-16' },
    body: JSON.stringify({
      client_id: creds.applicationId,
      access_token: accessToken,
    }),
  });
}

export async function fetchMerchantProfile(accessToken: string): Promise<{
  merchantId: string;
  businessName: string;
}> {
  const res = await fetch(`${squareApiBase()}/v2/merchants/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Square-Version': '2025-04-16',
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error('Failed to load Square merchant profile');
  const data = (await res.json()) as { merchant?: { id: string; business_name?: string } };
  const merchant = data.merchant;
  if (!merchant?.id) throw new Error('Square merchant profile missing');
  return { merchantId: merchant.id, businessName: merchant.business_name || 'Square merchant' };
}

export async function fetchLocations(accessToken: string): Promise<
  Array<{ id: string; name: string; status?: string }>
> {
  const res = await fetch(`${squareApiBase()}/v2/locations`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Square-Version': '2025-04-16',
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error('Failed to load Square locations');
  const data = (await res.json()) as {
    locations?: Array<{ id: string; name?: string; status?: string }>;
  };
  return (data.locations ?? []).map((loc) => ({
    id: loc.id,
    name: loc.name || loc.id,
    status: loc.status,
  }));
}