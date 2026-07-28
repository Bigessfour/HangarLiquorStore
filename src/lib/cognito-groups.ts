/**
 * Normalize cognito:groups from ID tokens / API Gateway JWT claims.
 * Keep in sync with backend/shared/auth/roles.ts parseCognitoGroups.
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

export function groupsRawType(raw: unknown): string {
  if (raw == null) return 'null';
  if (Array.isArray(raw)) return 'array';
  return typeof raw;
}
