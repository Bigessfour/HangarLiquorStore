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
 * naive `.split(',')` then fails Owner-only users on Manager+ routes.
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

export function groupsFromJwtClaims(claims: Record<string, unknown> | undefined | null): string[] {
  if (!claims) return [];
  return parseCognitoGroups(claims['cognito:groups']);
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
