import {
  DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import type {
  CreateLocalEventInput,
  InventoryRecord,
  LocalEvent,
  SalesRecord,
} from '../../../shared/types/forecast';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export async function getInventoryItems(upc?: string): Promise<InventoryRecord[]> {
  const table = requiredEnv('INVENTORY_TABLE');

  if (upc) {
    const result = await client.send(
      new GetCommand({
        TableName: table,
        Key: { upc },
      }),
    );

    if (!result.Item) return [];
    return [result.Item as InventoryRecord];
  }

  const result = await client.send(new ScanCommand({ TableName: table }));
  return (result.Items ?? []) as InventoryRecord[];
}

export async function getSalesHistoryForUpc(
  upc: string,
  startDate: string,
  endDate: string,
): Promise<SalesRecord[]> {
  const table = requiredEnv('SALES_HISTORY_TABLE');

  const result = await client.send(
    new QueryCommand({
      TableName: table,
      KeyConditionExpression: '#upc = :upc AND #date BETWEEN :start AND :end',
      ExpressionAttributeNames: {
        '#upc': 'upc',
        '#date': 'date',
      },
      ExpressionAttributeValues: {
        ':upc': upc,
        ':start': startDate,
        ':end': endDate,
      },
    }),
  );

  return (result.Items ?? []) as SalesRecord[];
}

export async function getLocalEvents(): Promise<LocalEvent[]> {
  const table = requiredEnv('LOCAL_EVENTS_TABLE');
  const storeId = requiredEnv('STORE_ID');

  const result = await client.send(
    new QueryCommand({
      TableName: table,
      KeyConditionExpression: '#storeId = :storeId',
      ExpressionAttributeNames: {
        '#storeId': 'storeId',
      },
      ExpressionAttributeValues: {
        ':storeId': storeId,
      },
    }),
  );

  return ((result.Items ?? []) as Array<LocalEvent & { eventId: string }>).map(
    (item) => ({
      id: item.eventId,
      name: item.name,
      startDate: item.startDate,
      endDate: item.endDate,
      multiplier: item.multiplier,
      notes: item.notes,
    }),
  );
}

export async function createLocalEvent(input: CreateLocalEventInput): Promise<LocalEvent> {
  const table = requiredEnv('LOCAL_EVENTS_TABLE');
  const storeId = requiredEnv('STORE_ID');
  const eventId = `evt_${Date.now()}`;

  const event = {
    storeId,
    eventId,
    ...input,
  };

  await client.send(
    new PutCommand({
      TableName: table,
      Item: event,
    }),
  );

  return {
    id: eventId,
    ...input,
  };
}

export async function deleteLocalEvent(eventId: string): Promise<void> {
  const table = requiredEnv('LOCAL_EVENTS_TABLE');
  const storeId = requiredEnv('STORE_ID');

  await client.send(
    new DeleteCommand({
      TableName: table,
      Key: { storeId, eventId },
    }),
  );
}