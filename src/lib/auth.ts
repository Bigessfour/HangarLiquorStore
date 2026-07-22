import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';

let userPool: CognitoUserPool | null = null;

function getUserPool(): CognitoUserPool | null {
  const poolId = import.meta.env.VITE_COGNITO_USER_POOL_ID || '';
  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID || '';
  if (!poolId || !clientId) return null;
  if (!userPool) {
    userPool = new CognitoUserPool({ UserPoolId: poolId, ClientId: clientId });
  }
  return userPool;
}

export function isCognitoConfigured(): boolean {
  return getUserPool() !== null;
}

export type UserRole = 'ReadOnly' | 'Manager' | 'Owner';

export interface AuthUser {
  username: string;
  token: string;
  role: UserRole;
}

export class NewPasswordRequiredError extends Error {
  constructor() {
    super('NEW_PASSWORD_REQUIRED');
    this.name = 'NewPasswordRequiredError';
  }
}

let currentUser: AuthUser | null = null;
let pendingPasswordUser: CognitoUser | null = null;
let pendingUsername = '';

const ROLE_HIERARCHY: UserRole[] = ['ReadOnly', 'Manager', 'Owner'];

function resolveRoleFromGroups(groups: string[]): UserRole {
  if (groups.includes('Owner')) return 'Owner';
  if (groups.includes('Manager')) return 'Manager';
  return 'ReadOnly';
}

export function getCurrentUser(): AuthUser | null {
  if (currentUser) return currentUser;

  const stored = localStorage.getItem('hanger_auth_user');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (!parsed.role) {
        parsed.role = 'ReadOnly';
      }
      currentUser = parsed;
      return currentUser;
    } catch {
      /* ignore corrupt storage */
    }
  }
  return null;
}

export function setCurrentUser(user: AuthUser | null) {
  currentUser = user;
  if (user) {
    localStorage.setItem('hanger_auth_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('hanger_auth_user');
  }
}

function parseJwt(token: string): Record<string, unknown> {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return {};
  }
}

function sessionToAuthUser(username: string, session: CognitoUserSession): AuthUser {
  const idToken = session.getIdToken().getJwtToken();
  const payload = parseJwt(idToken);
  const groups = payload['cognito:groups'];
  const groupList = Array.isArray(groups) ? groups.map(String) : [];
  const role = resolveRoleFromGroups(groupList);
  const authUser: AuthUser = { username, token: idToken, role };
  setCurrentUser(authUser);
  return authUser;
}

export function signIn(username: string, password: string): Promise<AuthUser> {
  const pool = getUserPool();
  if (!pool) {
    return Promise.reject(
      new Error(
        'Cognito is not configured. Set VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_CLIENT_ID, or use VITE_DEMO_AUTH=true for local demos.',
      ),
    );
  }

  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: username, Pool: pool });
    const authDetails = new AuthenticationDetails({ Username: username, Password: password });

    user.authenticateUser(authDetails, {
      onSuccess: (session) => {
        pendingPasswordUser = null;
        pendingUsername = '';
        resolve(sessionToAuthUser(username, session));
      },
      newPasswordRequired: () => {
        pendingPasswordUser = user;
        pendingUsername = username;
        reject(new NewPasswordRequiredError());
      },
      onFailure: (err) => {
        reject(err);
      },
    });
  });
}

export function completeNewPassword(newPassword: string): Promise<AuthUser> {
  if (!pendingPasswordUser || !pendingUsername) {
    return Promise.reject(new Error('No pending password change'));
  }

  return new Promise((resolve, reject) => {
    pendingPasswordUser!.completeNewPasswordChallenge(
      newPassword,
      {},
      {
        onSuccess: (session) => {
          const username = pendingUsername;
          pendingPasswordUser = null;
          pendingUsername = '';
          resolve(sessionToAuthUser(username, session));
        },
        onFailure: (err) => reject(err),
      },
    );
  });
}

export function signOut() {
  const pool = getUserPool();
  if (pool) {
    const user = pool.getCurrentUser();
    if (user) {
      user.signOut();
    }
  }
  pendingPasswordUser = null;
  pendingUsername = '';
  setCurrentUser(null);
}

export function getAuthToken(): string | null {
  const user = getCurrentUser();
  return user ? user.token : null;
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token && !token.startsWith('demo-') ? { Authorization: `Bearer ${token}` } : {};
}

export function getUserRole(): UserRole {
  const user = getCurrentUser();
  if (!user) return 'ReadOnly';
  // Re-derive from ID token so Owner stays Owner even if localStorage role is stale
  if (user.token && !user.token.startsWith('demo-')) {
    const payload = parseJwt(user.token);
    const groups = payload['cognito:groups'];
    const groupList = Array.isArray(groups)
      ? groups.map(String)
      : typeof groups === 'string'
        ? groups.startsWith('[')
          ? (() => {
              try {
                const parsed = JSON.parse(groups) as unknown;
                return Array.isArray(parsed) ? parsed.map(String) : [groups];
              } catch {
                return groups.split(/[, ]+/).filter(Boolean);
              }
            })()
          : groups.split(/[, ]+/).filter(Boolean)
        : [];
    if (groupList.length > 0) {
      const role = resolveRoleFromGroups(groupList);
      if (user.role !== role) {
        setCurrentUser({ ...user, role });
      }
      return role;
    }
  }
  return user.role || 'ReadOnly';
}

export function hasRole(required: UserRole): boolean {
  const current = getUserRole();
  return ROLE_HIERARCHY.indexOf(current) >= ROLE_HIERARCHY.indexOf(required);
}

export function canEdit(): boolean {
  return hasRole('Manager');
}

export function isOwner(): boolean {
  return hasRole('Owner');
}