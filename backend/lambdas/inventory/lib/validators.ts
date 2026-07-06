import {
  INVENTORY_CATEGORIES,
  type CreateInventoryInput,
  type CsvImportRow,
  type InventoryCategory,
  type QueuedSyncAction,
  type ScanInventoryInput,
  type UpdateInventoryInput,
} from '../../../shared/types/inventory';

function isCategory(value: string): value is InventoryCategory {
  return (INVENTORY_CATEGORIES as readonly string[]).includes(value);
}

function parseUpc(value: unknown): string {
  const upc = String(value ?? '').replace(/\D/g, '');
  if (upc.length < 8 || upc.length > 14) {
    throw new Error('UPC must be 8–14 digits');
  }
  return upc;
}

export function validateCreateInput(body: unknown): CreateInventoryInput {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a JSON object');
  }

  const input = body as Record<string, unknown>;
  const upc = parseUpc(input.upc);
  const name = String(input.name ?? '').trim();
  const category = String(input.category ?? 'Beer');
  const quantity = Number(input.quantity ?? 1);
  const reorderPoint = input.reorderPoint !== undefined ? Number(input.reorderPoint) : undefined;

  if (name.length < 1) throw new Error('Name is required');
  if (!isCategory(category)) throw new Error('Invalid category');
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error('Quantity must be a positive integer');
  }
  if (reorderPoint !== undefined && (!Number.isInteger(reorderPoint) || reorderPoint < 0)) {
    throw new Error('Reorder point must be a non-negative integer');
  }

  return { upc, name, category, quantity, reorderPoint };
}

export function validateUpdateInput(body: unknown, upc: string): UpdateInventoryInput {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a JSON object');
  }

  const input = body as Record<string, unknown>;
  const update: UpdateInventoryInput = { upc };

  if (input.name !== undefined) {
    const name = String(input.name).trim();
    if (name.length < 1) throw new Error('Name cannot be empty');
    update.name = name;
  }

  if (input.category !== undefined) {
    const category = String(input.category);
    if (!isCategory(category)) throw new Error('Invalid category');
    update.category = category;
  }

  if (input.currentStock !== undefined) {
    const currentStock = Number(input.currentStock);
    if (!Number.isInteger(currentStock) || currentStock < 0) {
      throw new Error('Current stock must be a non-negative integer');
    }
    update.currentStock = currentStock;
  }

  if (input.reorderPoint !== undefined) {
    const reorderPoint = Number(input.reorderPoint);
    if (!Number.isInteger(reorderPoint) || reorderPoint < 0) {
      throw new Error('Reorder point must be a non-negative integer');
    }
    update.reorderPoint = reorderPoint;
  }

  if (Object.keys(update).length === 1) {
    throw new Error('At least one field to update is required');
  }

  return update;
}

export function validateScanInput(body: unknown): ScanInventoryInput {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a JSON object');
  }

  const input = body as Record<string, unknown>;
  const upc = parseUpc(input.upc);
  const delta = Number(input.delta ?? -1);

  if (!Number.isInteger(delta)) throw new Error('Delta must be an integer');

  return { upc, delta };
}

export function validateImportRows(body: unknown): CsvImportRow[] {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a JSON object');
  }

  const input = body as Record<string, unknown>;
  const rows = input.rows;

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('rows must be a non-empty array');
  }

  return rows.map((row, index) => {
    if (!row || typeof row !== 'object') {
      throw new Error(`Row ${index + 1} is invalid`);
    }
    const r = row as Record<string, unknown>;
    const upc = parseUpc(r.upc);
    const name = String(r.name ?? '').trim();
    const category = String(r.category ?? 'Beer');
    const currentStock = Number(r.currentStock ?? 0);
    const reorderPoint = r.reorderPoint !== undefined ? Number(r.reorderPoint) : undefined;

    if (name.length < 1) throw new Error(`Row ${index + 1}: name is required`);
    if (!isCategory(category)) throw new Error(`Row ${index + 1}: invalid category`);
    if (!Number.isInteger(currentStock) || currentStock < 0) {
      throw new Error(`Row ${index + 1}: currentStock must be non-negative`);
    }

    return { upc, name, category, currentStock, reorderPoint };
  });
}

export function validateSyncActions(body: unknown): QueuedSyncAction[] {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a JSON object');
  }

  const input = body as Record<string, unknown>;
  const actions = input.actions;

  if (!Array.isArray(actions) || actions.length === 0) {
    throw new Error('actions must be a non-empty array');
  }

  return actions.map((action, index) => {
    if (!action || typeof action !== 'object') {
      throw new Error(`Action ${index + 1} is invalid`);
    }
    const a = action as Record<string, unknown>;
    const type = String(a.type ?? '');
    if (type !== 'add' && type !== 'adjust' && type !== 'sale') {
      throw new Error(`Action ${index + 1}: invalid type`);
    }

    const payload = a.payload;
    if (!payload || typeof payload !== 'object') {
      throw new Error(`Action ${index + 1}: payload is required`);
    }

    const p = payload as Record<string, unknown>;
    const upc = parseUpc(p.upc);

    return {
      id: String(a.id ?? `action_${index}`),
      type,
      payload: {
        upc,
        delta: p.delta !== undefined ? Number(p.delta) : undefined,
        quantity: p.quantity !== undefined ? Number(p.quantity) : undefined,
        name: p.name ? String(p.name) : undefined,
        category: p.category ? (String(p.category) as InventoryCategory) : undefined,
        productName: p.productName ? String(p.productName) : undefined,
      },
      timestamp: Number(a.timestamp ?? Date.now()),
    };
  });
}
