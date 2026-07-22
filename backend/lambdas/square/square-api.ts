import type { APIGatewayProxyHandlerV2, EventBridgeHandler } from 'aws-lambda';
import { frontendUrl, storeId, SQUARE_OAUTH_SCOPES } from './lib/config';
import {
  exchangeAuthorizationCode,
  fetchLocations,
  fetchMerchantProfile,
  newOAuthState,
  revokeSquareTokens,
  buildAuthorizationUrlAsync,
  getValidAccessToken,
} from './lib/oauth';
import { errorResponse, jsonResponse, redirectResponse } from './lib/response';
import {
  clearConnection,
  clearSquareTokens,
  getConnection,
  getSquareAccessToken,
  getSquareAppCredentials,
  saveConnection,
} from './lib/storage';
import { runSquareSync } from './lib/sync';
import { callerIsOwner, groupsFromJwtClaims } from '../../shared/auth/roles';

function getCallerGroups(event: {
  requestContext?: { authorizer?: { jwt?: { claims?: Record<string, unknown> } } };
}): string[] {
  return groupsFromJwtClaims(event.requestContext?.authorizer?.jwt?.claims);
}

function getCallerUsername(event: {
  requestContext?: { authorizer?: { jwt?: { claims?: Record<string, unknown> } } };
}): string {
  const claims = event.requestContext?.authorizer?.jwt?.claims || {};
  return String(claims.username || claims['cognito:username'] || '');
}

function requireOwner(groups: string[]) {
  if (!callerIsOwner(groups)) {
    throw new Error('Owner role required');
  }
}

function parsePath(
  rawPath: string,
): 'status' | 'authorize' | 'callback' | 'disconnect' | 'locations' | 'sync' | 'unknown' {
  if (rawPath.endsWith('/status')) return 'status';
  if (rawPath.endsWith('/authorize')) return 'authorize';
  if (rawPath.endsWith('/callback')) return 'callback';
  if (rawPath.endsWith('/disconnect')) return 'disconnect';
  if (rawPath.endsWith('/locations')) return 'locations';
  if (rawPath.endsWith('/sync')) return 'sync';
  return 'unknown';
}

function isScheduledEvent(event: unknown): boolean {
  if (!event || typeof event !== 'object') return false;
  const e = event as Record<string, unknown>;
  return e.source === 'aws.events' || e.source === 'scheduled-sync';
}

async function handleScheduledSync(): Promise<{ statusCode: number; body: string }> {
  const result = await runSquareSync({ source: 'scheduled' });
  return {
    statusCode: 200,
    body: JSON.stringify(result),
  };
}

export const handler:
  APIGatewayProxyHandlerV2 | EventBridgeHandler<'Scheduled Event', unknown, void> = async (
  event,
) => {
  if (isScheduledEvent(event)) {
    await handleScheduledSync();
    return;
  }

  const apiEvent = event as Parameters<APIGatewayProxyHandlerV2>[0];
  const method = apiEvent.requestContext.http.method;
  if (method === 'OPTIONS') return jsonResponse(200, {});

  const rawPath = apiEvent.rawPath ?? apiEvent.requestContext.http.path;
  const route = parsePath(rawPath);

  try {
    if (route === 'callback' && method === 'GET') {
      const code = apiEvent.queryStringParameters?.code;
      const state = apiEvent.queryStringParameters?.state;
      const error = apiEvent.queryStringParameters?.error;

      if (error) {
        return redirectResponse(
          `${frontendUrl()}/more?square=error&reason=${encodeURIComponent(error)}`,
        );
      }
      if (!code || !state) {
        return redirectResponse(`${frontendUrl()}/more?square=error&reason=missing_code`);
      }

      const record = await getConnection();
      if (!record?.oauthState || record.oauthState !== state) {
        return redirectResponse(`${frontendUrl()}/more?square=error&reason=invalid_state`);
      }
      if (record.oauthStateExpiresAt && Date.now() > record.oauthStateExpiresAt) {
        return redirectResponse(`${frontendUrl()}/more?square=error&reason=state_expired`);
      }

      const tokens = await exchangeAuthorizationCode(code);
      const profile = await fetchMerchantProfile(tokens.accessToken);
      const locations = await fetchLocations(tokens.accessToken);
      const primary = locations.find((l) => l.status === 'ACTIVE') ?? locations[0];

      await saveConnection({
        storeId: storeId(),
        connected: true,
        merchantId: profile.merchantId,
        merchantName: profile.businessName,
        locationId: primary?.id,
        locationName: primary?.name,
        connectedAt: new Date().toISOString(),
        connectedBy: record.connectedBy,
      });

      return redirectResponse(`${frontendUrl()}/more?square=connected`);
    }

    const groups = getCallerGroups(apiEvent);
    requireOwner(groups);

    if (route === 'status' && method === 'GET') {
      const credsConfigured = !!(await getSquareAppCredentials());
      const record = await getConnection();
      return jsonResponse(200, {
        credentialsConfigured: credsConfigured,
        connected: !!record?.connected,
        merchantName: record?.merchantName ?? null,
        merchantId: record?.merchantId ?? null,
        locationName: record?.locationName ?? null,
        locationId: record?.locationId ?? null,
        connectedAt: record?.connectedAt ?? null,
        connectedBy: record?.connectedBy ?? null,
        lastSyncAt: record?.lastSyncAt ?? null,
        lastSyncSummary: record?.lastSyncSummary ?? null,
        scopes: [...SQUARE_OAUTH_SCOPES],
      });
    }

    if (route === 'authorize' && method === 'GET') {
      const state = newOAuthState();
      const authUrl = await buildAuthorizationUrlAsync(state);
      if (!authUrl) {
        return errorResponse(
          503,
          'Square application credentials are not configured yet. See docs/square-owner-setup.md',
        );
      }

      const existing = (await getConnection()) ?? { storeId: storeId(), connected: false };
      await saveConnection({
        ...existing,
        storeId: storeId(),
        oauthState: state,
        oauthStateExpiresAt: Date.now() + 10 * 60 * 1000,
        connectedBy: getCallerUsername(apiEvent),
      });

      return jsonResponse(200, { authorizationUrl: authUrl });
    }

    if (route === 'locations' && method === 'GET') {
      const token = await getValidAccessToken();
      if (!token) return errorResponse(400, 'Square is not connected');
      const locations = await fetchLocations(token);
      return jsonResponse(200, { locations });
    }

    if (route === 'sync' && method === 'POST') {
      const result = await runSquareSync({ source: 'manual' });
      if ('skipped' in result && result.skipped) {
        return errorResponse(400, result.reason);
      }
      return jsonResponse(200, result);
    }

    if (route === 'disconnect' && method === 'POST') {
      const token = await getSquareAccessToken();
      if (token) await revokeSquareTokens(token);
      await clearSquareTokens();
      await clearConnection();
      return jsonResponse(200, { disconnected: true });
    }

    return errorResponse(404, 'Not found');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Square request failed';
    const status = message.includes('Owner role required') ? 403 : 500;
    return errorResponse(status, message);
  }
};
