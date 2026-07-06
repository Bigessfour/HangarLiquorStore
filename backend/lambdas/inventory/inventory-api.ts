import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
  adjustInventoryStock,
  createOrAddInventory,
  getInventoryRecord,
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

type InventoryResource = 'list' | 'item' | 'scan' | 'import' | 'sync';

function parseInventoryPath(rawPath: string): { resource: InventoryResource; upc?: string } {
  const base = '/api/inventory';
  if (rawPath === base) return { resource: 'list' };

  const suffix = rawPath.startsWith(`${base}/`) ? rawPath.slice(base.length + 1) : '';
  if (!suffix) return { resource: 'list' };
  if (suffix === 'scan') return { resource: 'scan' };
  if (suffix === 'import') return { resource: 'import' };
  if (suffix === 'sync') return { resource: 'sync' };

  return { resource: 'item', upc: suffix };
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const method = event.requestContext.http.method;

  if (method === 'OPTIONS') {
    return jsonResponse(200, {});
  }

  const rawPath = event.rawPath ?? event.requestContext.http.path;
  const { resource, upc: pathUpc } = parseInventoryPath(rawPath);

  try {
    if (resource === 'list' && method === 'GET') {
      const search = event.queryStringParameters?.search;
      const category = event.queryStringParameters?.category;
      const items = await listInventoryRecords(search, category);
      return jsonResponse(200, items);
    }

    if (resource === 'item' && method === 'GET' && pathUpc) {
      const item = await getInventoryRecord(pathUpc);
      if (!item) return errorResponse(404, 'Item not found');
      return jsonResponse(200, item);
    }

    if (resource === 'list' && method === 'POST') {
      const input = validateCreateInput(JSON.parse(event.body ?? '{}'));
      const created = await createOrAddInventory(input);
      return jsonResponse(201, created);
    }

    if (resource === 'item' && method === 'PATCH' && pathUpc) {
      const input = validateUpdateInput(JSON.parse(event.body ?? '{}'), pathUpc);
      const updated = await updateInventoryRecord(input);
      return jsonResponse(200, updated);
    }

    if (resource === 'scan' && method === 'POST') {
      const input = validateScanInput(JSON.parse(event.body ?? '{}'));
      const updated = await adjustInventoryStock(input.upc, input.delta);
      return jsonResponse(200, updated);
    }

    if (resource === 'import' && method === 'POST') {
      const rows = validateImportRows(JSON.parse(event.body ?? '{}'));
      const result = await importInventoryRows(rows);
      return jsonResponse(200, result);
    }

    if (resource === 'sync' && method === 'POST') {
      const actions = validateSyncActions(JSON.parse(event.body ?? '{}'));
      const result = await processSyncActions(actions);
      return jsonResponse(200, result);
    }

    return errorResponse(405, `Method ${method} not allowed for ${rawPath}`);
  } catch (error) {
    console.error('inventory-api error', error);
    const message = error instanceof Error ? error.message : 'Inventory request failed';
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
