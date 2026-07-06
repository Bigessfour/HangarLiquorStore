import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';

const poolData = {
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
};

export const userPool = new CognitoUserPool(poolData);

export type UserRole = 'ReadOnly' | 'Manager' | 'Owner';

export interface AuthUser {
  username: string;
  token: string;
  role: UserRole;
}

let currentUser: AuthUser | null = null;

export function getCurrentUser(): AuthUser | null {
  if (currentUser) return currentUser;

  const stored = localStorage.getItem('hanger_auth_user');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Backward compat for users without role
      if (!parsed.role) {
        parsed.role = 'ReadOnly';
      }
      currentUser = parsed;
      return currentUser;
    } catch {}
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

function parseJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return {};
  }
}

export function signIn(username: string, password: string): Promise<AuthUser> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: username, Pool: userPool });
    const authDetails = new AuthenticationDetails({ Username: username, Password: password });

    user.authenticateUser(authDetails, {
      onSuccess: (session: CognitoUserSession) => {
        const idToken = session.getIdToken().getJwtToken();
        const payload = parseJwt(idToken);
        const groups: string[] = payload['cognito:groups'] || [];
        
        // Determine role from Cognito groups. Default to ReadOnly.
        let role: UserRole = 'ReadOnly';
        if (groups.includes('Owner')) role = 'Owner';
        else if (groups.includes('Manager')) role = 'Manager';

        const authUser: AuthUser = { username, token: idToken, role };
        setCurrentUser(authUser);
        resolve(authUser);
      },
      onFailure: (err) => {
        reject(err);
      },
    });
  });
}

export function signOut() {
  const user = userPool.getCurrentUser();
  if (user) {
    user.signOut();
  }
  setCurrentUser(null);
}

export function getAuthToken(): string | null {
  const user = getCurrentUser();
  return user ? user.token : null;
}

// Helper to get auth headers for API calls
export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getUserRole(): UserRole {
  const user = getCurrentUser();
  return user?.role || 'ReadOnly';
}

export function hasRole(required: UserRole): boolean {
  const current = getUserRole();
  const hierarchy: UserRole[] = ['ReadOnly', 'Manager', 'Owner'];
  return hierarchy.indexOf(current) >= hierarchy.indexOf(required);
}

export function canEdit(): boolean {
  return hasRole('Manager');
}

export function isOwner(): boolean {
  return hasRole('Owner');
}
