import { setCurrentUser, type AuthUser } from '@/lib/auth';

const DEMO_USER: AuthUser = {
  username: 'demo-owner',
  token: 'demo-token',
  role: 'Owner',
};

export function isDemoAuthEnabled(): boolean {
  return import.meta.env.VITE_DEMO_AUTH === 'true';
}

/** Auto-login as Owner for local demos and e2e when Cognito is not configured. */
export function ensureDemoUser(): AuthUser | null {
  if (!isDemoAuthEnabled()) return null;
  setCurrentUser(DEMO_USER);
  return DEMO_USER;
}