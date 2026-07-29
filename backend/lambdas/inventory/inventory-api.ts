import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  ListUsersCommand,
  AdminGetUserCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  AdminSetUserPasswordCommand,
  AdminResetUserPasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import {
  adjustInventoryStock,
  createOrAddInventory,
  getInventoryRecord,
  getProductRecord,
  importInventoryRows,
  listInventoryRecords,
  processSyncActions,
  updateInventoryRecord,
} from './lib/dynamodb';
import { errorResponse, jsonResponse } from './lib/response';
import {
  validateCreateInput,
  validateImportRows,
  validateScanInput,
  validateSyncActions,
  validateUpdateInput,
} from './lib/validators';
import {
  callerHasManagerAccess,
  callerIsOwner,
  groupsFromApiGatewayEvent,
  logAuthDeny,
} from '../../shared/auth/roles';

/** Hide Square-derived shelf/cost from ReadOnly — money fields stay Manager+ (Profit path). */
function stripCostFields<T extends Record<string, unknown>>(row: T): Omit<T, 'unitPrice' | 'unitCost'> {
  const { unitPrice: _p, unitCost: _c, ...rest } = row;
  return rest;
}

function forClientInventory<T extends Record<string, unknown>>(
  row: T,
  isManager: boolean,
): T | Omit<T, 'unitPrice' | 'unitCost'> {
  return isManager ? row : stripCostFields(row);
}

type InventoryResource = 'list' | 'item' | 'scan' | 'import' | 'sync' | 'product' | 'users';

function parseInventoryPath(rawPath: string): { resource: InventoryResource; upc?: string; username?: string } {
  // Support both /api/inventory/* and top-level /api/users for admin
  let base = '/api/inventory';
  let suffix = '';

  if (rawPath.startsWith('/api/users')) {
    suffix = rawPath.slice('/api'.length); // treat /users as special
    if (suffix === '/users') return { resource: 'users' };
    if (suffix.startsWith('/users/')) {
      const rest = suffix.slice('/users/'.length);
      const parts = rest.split('/');
      return { resource: 'users', username: parts[0] };
    }
  }

  if (rawPath === base) return { resource: 'list' };

  suffix = rawPath.startsWith(`${base}/`) ? rawPath.slice(base.length + 1) : '';
  if (!suffix) return { resource: 'list' };
  if (suffix === 'scan') return { resource: 'scan' };
  if (suffix === 'import') return { resource: 'import' };
  if (suffix === 'sync') return { resource: 'sync' };

  // Support product lookup e.g. /api/inventory/products/{upc} or treat as product for now
  if (suffix.startsWith('products/')) {
    return { resource: 'product', upc: suffix.slice('products/'.length) };
  }

  // User management under inventory too
  if (suffix === 'users' || suffix.startsWith('users')) {
    const parts = suffix.split('/');
    if (parts[1]) {
      return { resource: 'users', username: parts[1] };
    }
    return { resource: 'users' };
  }

  return { resource: 'item', upc: suffix };
}

function getCallerGroups(event: {
  requestContext?: { authorizer?: { jwt?: { claims?: Record<string, unknown> } } };
  headers?: Record<string, string | undefined>;
}): string[] {
  return groupsFromApiGatewayEvent(event);
}

function requireRole(
  groups: string[],
  minRole: 'Manager' | 'Owner',
  meta?: { path?: string; method?: string },
) {
  if (minRole === 'Owner' && !callerIsOwner(groups)) {
    logAuthDeny({ required: 'Owner', groups, path: meta?.path, method: meta?.method });
    throw new Error('Owner role required');
  }
  if (minRole === 'Manager' && !callerHasManagerAccess(groups)) {
    logAuthDeny({ required: 'Manager', groups, path: meta?.path, method: meta?.method });
    throw new Error('Manager or Owner role required');
  }
}

const cognitoClient = new CognitoIdentityProviderClient({});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const method = event.requestContext.http.method;

  if (method === 'OPTIONS') {
    return jsonResponse(200, {});
  }

  const rawPath = event.rawPath ?? event.requestContext.http.path;
  const { resource, upc: pathUpc, username: pathUsername } = parseInventoryPath(rawPath);

  try {
    if (resource === 'list' && method === 'GET') {
      const search = event.queryStringParameters?.search;
      const category = event.queryStringParameters?.category;
      const items = await listInventoryRecords(search, category);
      const isManager = callerHasManagerAccess(getCallerGroups(event));
      return jsonResponse(
        200,
        items.map((item) => forClientInventory(item as Record<string, unknown>, isManager)),
      );
    }

    if (resource === 'item' && method === 'GET' && pathUpc) {
      const item = await getInventoryRecord(pathUpc);
      if (!item) return errorResponse(404, 'Item not found');
      const isManager = callerHasManagerAccess(getCallerGroups(event));
      return jsonResponse(200, forClientInventory(item as Record<string, unknown>, isManager));
    }

    if (resource === 'list' && method === 'POST') {
      requireRole(getCallerGroups(event), 'Manager', { path: rawPath, method });
      const input = validateCreateInput(JSON.parse(event.body ?? '{}'));
      const created = await createOrAddInventory(input);
      return jsonResponse(201, created);
    }

    if (resource === 'item' && method === 'PATCH' && pathUpc) {
      requireRole(getCallerGroups(event), 'Manager', { path: rawPath, method });
      const input = validateUpdateInput(JSON.parse(event.body ?? '{}'), pathUpc);
      const updated = await updateInventoryRecord(input);
      return jsonResponse(200, updated);
    }

    if (resource === 'scan' && method === 'POST') {
      // Floor scans: any authenticated user (JWT) may adjust stock
      const input = validateScanInput(JSON.parse(event.body ?? '{}'));
      const updated = await adjustInventoryStock(input.upc, input.delta);
      return jsonResponse(200, updated);
    }

    if (resource === 'import' && method === 'POST') {
      requireRole(getCallerGroups(event), 'Manager', { path: rawPath, method });
      const rows = validateImportRows(JSON.parse(event.body ?? '{}'));
      const result = await importInventoryRows(rows);
      return jsonResponse(200, result);
    }

    if (resource === 'sync' && method === 'POST') {
      // Offline queue sync: JWT only (same as scan)
      const actions = validateSyncActions(JSON.parse(event.body ?? '{}'));
      const result = await processSyncActions(actions);
      return jsonResponse(200, result);
    }

    if (resource === 'product' && method === 'GET' && pathUpc) {
      // Product info from OFF dump data in products table (for free/low-cost offline lookup)
      const product = await getProductRecord(pathUpc);
      if (!product) return errorResponse(404, 'Product not found in catalog');
      const isManager = callerHasManagerAccess(getCallerGroups(event));
      return jsonResponse(200, forClientInventory(product as Record<string, unknown>, isManager));
    }

    // ========== User Management (Owner/Manager only) ==========
    const groups = getCallerGroups(event);
    if (resource === 'users') {
      const username = pathUsername ?? event.pathParameters?.username;
      const isOwnerUser = callerIsOwner(groups);
      const isManagerUser = callerHasManagerAccess(groups);

      if (method === 'GET') {
        requireRole(groups, 'Manager', { path: rawPath, method });
        const listRes = await cognitoClient.send(new ListUsersCommand({
          UserPoolId: process.env.COGNITO_USER_POOL_ID,
          Limit: 60,
        }));
        const users = (listRes.Users || []).map(u => {
          const attrs = Object.fromEntries((u.Attributes || []).map(a => [a.Name, a.Value]));
          return {
            username: u.Username,
            email: attrs.email,
            name: attrs.name || attrs.given_name,
            status: u.UserStatus,
            enabled: u.Enabled,
          };
        });
        return jsonResponse(200, users);
      }

      if (method === 'POST' && !username) {
        // Managers can ONLY create ReadOnly; Owners can create any
        requireRole(groups, 'Manager', { path: rawPath, method });
        const body = JSON.parse(event.body || '{}');
        let { username: newUsername, tempPassword, name, role = 'ReadOnly' } = body;

        if (!newUsername || !tempPassword) {
          return errorResponse(400, 'username and tempPassword required');
        }

        if (!isOwnerUser && role !== 'ReadOnly') {
          return errorResponse(403, 'Managers can only create ReadOnly users');
        }

        await cognitoClient.send(new AdminCreateUserCommand({
          UserPoolId: process.env.COGNITO_USER_POOL_ID,
          Username: newUsername,
          TemporaryPassword: tempPassword,
          UserAttributes: [
            { Name: 'email', Value: newUsername },
            { Name: 'email_verified', Value: 'true' },
            ...(name ? [{ Name: 'name', Value: name }] : []),
          ],
          MessageAction: 'SUPPRESS',
        }));

        await cognitoClient.send(new AdminAddUserToGroupCommand({
          UserPoolId: process.env.COGNITO_USER_POOL_ID,
          Username: newUsername,
          GroupName: role,
        }));

        return jsonResponse(201, { username: newUsername, role });
      }

      if (method === 'POST' && username && rawPath.includes('/role')) {
        requireRole(groups, 'Owner', { path: rawPath, method }); // Only owner changes roles
        const body = JSON.parse(event.body || '{}');
        const { role } = body;
        if (!role) return errorResponse(400, 'role required');

        const currentGroups = ['ReadOnly', 'Manager', 'Owner'];
        for (const g of currentGroups) {
          try {
            await cognitoClient.send(new AdminRemoveUserFromGroupCommand({
              UserPoolId: process.env.COGNITO_USER_POOL_ID,
              Username: username,
              GroupName: g,
            }));
          } catch {}
        }
        await cognitoClient.send(new AdminAddUserToGroupCommand({
          UserPoolId: process.env.COGNITO_USER_POOL_ID,
          Username: username,
          GroupName: role,
        }));
        return jsonResponse(200, { username, role });
      }

      if (method === 'POST' && username && rawPath.includes('/disable')) {
        requireRole(groups, 'Owner', { path: rawPath, method });
        await cognitoClient.send(new AdminDisableUserCommand({
          UserPoolId: process.env.COGNITO_USER_POOL_ID,
          Username: username,
        }));
        return jsonResponse(200, { username, disabled: true });
      }

      if (method === 'POST' && username && rawPath.includes('/enable')) {
        requireRole(groups, 'Owner', { path: rawPath, method });
        await cognitoClient.send(new AdminEnableUserCommand({
          UserPoolId: process.env.COGNITO_USER_POOL_ID,
          Username: username,
        }));
        return jsonResponse(200, { username, enabled: true });
      }

      if (method === 'POST' && username && rawPath.includes('/reset-password')) {
        requireRole(groups, 'Manager', { path: rawPath, method }); // Manager or Owner can trigger reset
        // Set a new temporary password that forces change on next login
        const newTemp = 'Temp' + Math.random().toString(36).slice(2, 10) + '1!';
        await cognitoClient.send(new AdminSetUserPasswordCommand({
          UserPoolId: process.env.COGNITO_USER_POOL_ID,
          Username: username,
          Password: newTemp,
          Permanent: false, // Forces change on login
        }));
        // Return the temp password so owner/manager can tell the employee
        return jsonResponse(200, { username, temporaryPassword: newTemp, message: 'User must change password on next login.' });
      }

      if (method === 'POST' && username && rawPath.includes('/remove-groups')) {
        requireRole(groups, 'Owner', { path: rawPath, method });
        const currentGroups = ['ReadOnly', 'Manager', 'Owner'];
        for (const g of currentGroups) {
          try {
            await cognitoClient.send(new AdminRemoveUserFromGroupCommand({
              UserPoolId: process.env.COGNITO_USER_POOL_ID,
              Username: username,
              GroupName: g,
            }));
          } catch {}
        }
        return jsonResponse(200, { username, removedFromAllGroups: true });
      }

      return errorResponse(405, 'Method not allowed for users');
    }

    return errorResponse(405, `Method ${method} not allowed for ${rawPath}`);
  } catch (error) {
    console.error('inventory-api error', error);
    const message = error instanceof Error ? error.message : 'Inventory request failed';
    if (message.includes('Owner role required') || message.includes('Manager or Owner role required')) {
      return errorResponse(403, message);
    }
    const statusCode =
      message.includes('must') ||
      message.includes('required') ||
      message.includes('invalid') ||
      message.includes('not found')
        ? message.includes('not found')
          ? 404
          : 400
        : 500;
    return errorResponse(statusCode, message);
  }
};
