export type UserRole = 'ReadOnly' | 'Manager' | 'Owner';

const ROLE_HIERARCHY: UserRole[] = ['ReadOnly', 'Manager', 'Owner'];

export function resolveRoleFromGroups(groups: string[]): UserRole {
  if (groups.includes('Owner')) return 'Owner';
  if (groups.includes('Manager')) return 'Manager';
  return 'ReadOnly';
}

/**
 * Normalize cognito:groups from API Gateway JWT claims.
 * API GW often passes groups as a JSON string (e.g. `["Owner"]`) instead of an array —
 * naive `.split(',')` then fails Owner-only users on Manager+ / Owner routes.
 */
export function parseCognitoGroups(raw: unknown): string[] {
  if (raw == null) return [];

  if (Array.isArray(raw)) {
    return raw.map(String).map((g) => g.trim()).filter(Boolean);
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (Array.isArray(parsed)) {
          return parsed.map(String).map((g) => g.trim()).filter(Boolean);
        }
      } catch {
        /* fall through */
      }
    }

    return trimmed
      .split(/[, ]+/)
      .map((g) => g.replace(/^\[|"|\]$/g, '').trim())
      .filter(Boolean);
  }

  return [];
}

function groupsFromClaimsObject(claims: Record<string, unknown> | undefined | null): string[] {
  if (!claims) return [];
  const raw =
    claims['cognito:groups'] ??
    claims['cognito%3Agroups'] ??
    claims['Cognito:groups'];
  return parseCognitoGroups(raw);
}

export function groupsFromJwtClaims(claims: Record<string, unknown> | undefined | null): string[] {
  return groupsFromClaimsObject(claims);
}

/** Decode JWT payload without verifying (API GW already verified the token). */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
    const json = Buffer.from(b64 + pad, 'base64').toString('utf8');
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

type ApiGwAuthEvent = {
  requestContext?: {
    authorizer?: {
      jwt?: { claims?: Record<string, unknown> };
      claims?: Record<string, unknown>;
    };
  };
  headers?: Record<string, string | undefined>;
};

/**
 * Prefer API Gateway authorizer claims; fall back to decoding the Bearer ID token.
 * Fixes Owner routes when claim packaging differs by route or authorizer version.
 */
export function groupsFromApiGatewayEvent(event: ApiGwAuthEvent): string[] {
  const authz = event.requestContext?.authorizer;
  const fromJwtAuthorizer = groupsFromClaimsObject(authz?.jwt?.claims);
  if (fromJwtAuthorizer.length > 0) return fromJwtAuthorizer;

  const fromLegacyAuthorizer = groupsFromClaimsObject(authz?.claims);
  if (fromLegacyAuthorizer.length > 0) return fromLegacyAuthorizer;

  const headers = event.headers || {};
  const authHeader = headers.authorization || headers.Authorization || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (match?.[1]) {
    const payload = decodeJwtPayload(match[1].trim());
    const fromToken = groupsFromClaimsObject(payload);
    if (fromToken.length > 0) return fromToken;
  }

  return [];
}

export function hasMinimumRole(current: UserRole, required: UserRole): boolean {
  return ROLE_HIERARCHY.indexOf(current) >= ROLE_HIERARCHY.indexOf(required);
}

/** Manager or Owner (Owner satisfies Manager). */
export function callerHasManagerAccess(groups: string[]): boolean {
  return hasMinimumRole(resolveRoleFromGroups(groups), 'Manager');
}

export function callerIsOwner(groups: string[]): boolean {
  return resolveRoleFromGroups(groups) === 'Owner';
}

export function canEditInventory(role: UserRole): boolean {
  return hasMinimumRole(role, 'Manager');
}

export function canManageUsers(role: UserRole): boolean {
  return hasMinimumRole(role, 'Manager');
}

export function canChangeRoles(role: UserRole): boolean {
  return role === 'Owner';
}
