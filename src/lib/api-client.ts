import { getCurrentUser, getFreshAuthHeaders, refreshAuthSession, signOut } from './auth';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

function isApiDebugEnabled(): boolean {
  return import.meta.env.DEV || import.meta.env.VITE_DEBUG_AUTH === 'true';
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function redirectToLogin(reason: string): void {
  if (typeof window === 'undefined') return;
  if (window.location.pathname.includes('/login')) return;
  const q = reason ? `?reason=${encodeURIComponent(reason)}` : '';
  window.location.assign(`/login${q}`);
}

async function parseErrorMessage(response: Response): Promise<string> {
  let message = 'Request failed';
  try {
    const body = (await response.json()) as { error?: string; message?: string };
    message = body.error ?? body.message ?? message;
  } catch {
    try {
      const text = await response.text();
      if (text) message = text.slice(0, 200);
    } catch {
      /* keep default */
    }
  }
  return message;
}

async function fetchOnce(
  path: string,
  options: RequestInit | undefined,
  authHeaders: Record<string, string>,
): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options?.headers,
    },
  });
}

function forceSessionExpired(message: string): never {
  signOut();
  redirectToLogin('session');
  throw new ApiError(401, message || 'Unauthorized');
}

/**
 * Authenticated API client. Refreshes Cognito ID token before calls and once on 401
 * so Owner sessions do not die with API Gateway "Unauthorized" after the 1h ID token expires.
 */
export async function apiClient<T>(path: string, options?: RequestInit): Promise<T> {
  const method = options?.method ?? 'GET';
  let authHeaders = await getFreshAuthHeaders();

  // Never hit JWT-protected APIs without a Bearer token while a Cognito user is "logged in"
  if (!authHeaders.Authorization) {
    const user = getCurrentUser();
    if (user && !user.token.startsWith('demo-') && API_BASE) {
      const refreshed = await refreshAuthSession();
      if (!refreshed?.token) {
        if (isApiDebugEnabled()) {
          console.warn('[api]', { method, path, message: 'No Bearer token after refresh' });
        }
        forceSessionExpired('Unauthorized');
      }
      authHeaders = await getFreshAuthHeaders();
    }
  }

  let response = await fetchOnce(path, options, authHeaders);

  if (response.status === 401) {
    const refreshed = await refreshAuthSession();
    if (refreshed?.token) {
      authHeaders = { Authorization: `Bearer ${refreshed.token}` };
      response = await fetchOnce(path, options, authHeaders);
    }
  }

  if (response.status === 401) {
    const message = await parseErrorMessage(response);
    if (isApiDebugEnabled()) {
      console.warn('[api]', { status: 401, method, path, message, action: 'signOut' });
    }
    forceSessionExpired(message);
  }

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    if (isApiDebugEnabled()) {
      console.warn('[api]', { status: response.status, method, path, message });
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
