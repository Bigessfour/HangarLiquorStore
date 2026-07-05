import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import type {
  CreateInventoryInput,
  CsvImportRow,
  InventoryRecord,
  QueuedSyncAction,
  UpdateInventoryInput,
} from '../../../shared/types/inventory';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function tableName(): string {
  return requiredEnv('INVENTORY_TABLE');
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function listInventoryRecords(
  search?: string,
  category?: string,
): Promise<InventoryRecord[]> {
  const result = await client.send(new ScanCommand({ TableName: tableName() }));
  let items = (result.Items ?? []) as InventoryRecord[];

  const normalizedSearch = search?.trim().toLowerCase();
  if (normalizedSearch) {
    items = items.filter(
      (item) =>
        item.name.toLowerCase().includes(normalizedSearch) || item.upc.includes(normalizedSearch),
    );
  }

  if (category && category !== 'All') {
    items = items.filter((item) => item.category === category);
  }

  return items.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getInventoryRecord(upc: string): Promise<InventoryRecord | null> {
  const result = await client.send(
    new GetCommand({
      TableName: tableName(),
      Key: { upc },
    }),
  );

  return (result.Item as InventoryRecord | undefined) ?? null;
}

export async function createOrAddInventory(input: CreateInventoryInput): Promise<InventoryRecord> {
  const existing = await getInventoryRecord(input.upc);

  if (existing) {
    const updated: InventoryRecord = {
      ...existing,
      name: input.name,
      category: input.category,
      currentStock: existing.currentStock + input.quantity,
      reorderPoint: input.reorderPoint ?? existing.reorderPoint,
      updatedAt: nowIso(),
    };

    await client.send(
      new PutCommand({
        TableName: tableName(),
        Item: updated,
      }),
    );

    return updated;
  }

  const created: InventoryRecord = {
    upc: input.upc,
    name: input.name,
    category: input.category,
    currentStock: input.quantity,
    reorderPoint: input.reorderPoint ?? 6,
    updatedAt: nowIso(),
  };

  await client.send(
    new PutCommand({
      TableName: tableName(),
      Item: created,
    }),
  );

  return created;
}

export async function updateInventoryRecord(input: UpdateInventoryInput): Promise<InventoryRecord> {
  const existing = await getInventoryRecord(input.upc);
  if (!existing) throw new Error('Item not found');

  const updated: InventoryRecord = {
    ...existing,
    ...input,
    updatedAt: nowIso(),
  };

  await client.send(
    new PutCommand({
      TableName: tableName(),
      Item: updated,
    }),
  );

  return updated;
}

export async function adjustInventoryStock(upc: string, delta: number): Promise<InventoryRecord> {
  const existing = await getInventoryRecord(upc);
  if (!existing) throw new Error('Item not found');

  const updated: InventoryRecord = {
    ...existing,
    currentStock: Math.max(0, existing.currentStock + delta),
    updatedAt: nowIso(),
  };

  await client.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: { upc },
      UpdateExpression: 'SET currentStock = :stock, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':stock': updated.currentStock,
        ':updatedAt': updated.updatedAt,
      },
    }),
  );

  return updated;
}

export async function importInventoryRows(rows: CsvImportRow[]): Promise<{ imported: number }> {
  for (const row of rows) {
    const existing = await getInventoryRecord(row.upc);
    const record: InventoryRecord = {
      upc: row.upc,
      name: row.name,
      category: row.category,
      currentStock: row.currentStock,
      reorderPoint: row.reorderPoint ?? existing?.reorderPoint ?? 6,
      updatedAt: nowIso(),
    };

    await client.send(
      new PutCommand({
        TableName: tableName(),
        Item: record,
      }),
    );
  }

  return { imported: rows.length };
}

export async function processSyncActions(
  actions: QueuedSyncAction[],
): Promise<{ synced: number; results: InventoryRecord[] }> {
  const results: InventoryRecord[] = [];

  for (const action of actions) {
    const { upc } = action.payload;

    if (action.type === 'add') {
      const quantity = action.payload.quantity ?? 1;
      const name = action.payload.name ?? action.payload.productName ?? `Item ${upc}`;
      const category = action.payload.category ?? 'Beer';
      const record = await createOrAddInventory({ upc, name, category, quantity });
      results.push(record);
      continue;
    }

    const delta =
      action.type === 'sale' ? (action.payload.delta ?? -1) : (action.payload.delta ?? 0);

    if (delta !== 0) {
      const record = await adjustInventoryStock(upc, delta);
      results.push(record);
    }
  }

  return { synced: actions.length, results };
}
