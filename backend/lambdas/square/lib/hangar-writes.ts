import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { inventoryTable, productsTable, salesHistoryTable } from './config';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export async function putSalesQuantity(upc: string, date: string, quantity: number): Promise<void> {
  if (!upc || quantity < 0) return;
  await ddb.send(
    new PutCommand({
      TableName: salesHistoryTable(),
      Item: {
        upc,
        date,
        quantity,
        source: 'square',
        updatedAt: new Date().toISOString(),
      },
    }),
  );
}

/** Zero out Square-sourced sales rows in [start, end] that were not rewritten this sync. */
export async function clearStaleSquareSales(
  keepKeys: Set<string>,
  startDate: string,
  endDate: string,
): Promise<number> {
  const table = salesHistoryTable();
  let cleared = 0;
  let lastKey: Record<string, unknown> | undefined;

  do {
    const page = await ddb.send(
      new ScanCommand({
        TableName: table,
        FilterExpression: '#src = :square AND #date BETWEEN :start AND :end',
        ExpressionAttributeNames: { '#src': 'source', '#date': 'date' },
        ExpressionAttributeValues: {
          ':square': 'square',
          ':start': startDate,
          ':end': endDate,
        },
        ExclusiveStartKey: lastKey,
      }),
    );

    for (const item of page.Items ?? []) {
      const upc = String(item.upc ?? '');
      const date = String(item.date ?? '');
      const key = `${upc}|${date}`;
      if (!upc || !date || keepKeys.has(key)) continue;
      await ddb.send(
        new PutCommand({
          TableName: table,
          Item: {
            upc,
            date,
            quantity: 0,
            source: 'square',
            updatedAt: new Date().toISOString(),
            clearedBySync: true,
          },
        }),
      );
      cleared += 1;
    }

    lastKey = page.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  return cleared;
}

export async function upsertProductFromSquare(input: {
  upc: string;
  name: string;
  category?: string;
  squareCatalogObjectId?: string;
  squareVariationId?: string;
}): Promise<void> {
  if (!input.upc) return;
  const table = productsTable();
  const existing = await ddb.send(new GetCommand({ TableName: table, Key: { upc: input.upc } }));
  const prev = (existing.Item ?? {}) as Record<string, unknown>;

  await ddb.send(
    new PutCommand({
      TableName: table,
      Item: {
        ...prev,
        upc: input.upc,
        name: input.name || (prev.name as string) || 'Square item',
        category: input.category || (prev.category as string) || 'General',
        squareCatalogObjectId: input.squareCatalogObjectId ?? prev.squareCatalogObjectId,
        squareVariationId: input.squareVariationId ?? prev.squareVariationId,
        source: 'square',
        updatedAt: new Date().toISOString(),
      },
    }),
  );
}

export async function updateInventoryStockIfExists(
  upc: string,
  currentStock: number,
): Promise<boolean> {
  const table = inventoryTable();
  const existing = await ddb.send(new GetCommand({ TableName: table, Key: { upc } }));
  if (!existing.Item) return false;

  await ddb.send(
    new UpdateCommand({
      TableName: table,
      Key: { upc },
      UpdateExpression:
        'SET currentStock = :stock, updatedAt = :updatedAt, squareSyncedAt = :synced',
      ExpressionAttributeValues: {
        ':stock': Math.max(0, Math.round(currentStock)),
        ':updatedAt': new Date().toISOString(),
        ':synced': new Date().toISOString(),
      },
    }),
  );
  return true;
}
