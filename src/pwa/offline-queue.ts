import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface QueuedActionPayload {
  upc: string;
  delta?: number;
  quantity?: number;
  name?: string;
  category?: string;
  productName?: string;
}

export interface QueuedAction {
  id: string;
  type: 'add' | 'adjust' | 'sale';
  payload: QueuedActionPayload;
  timestamp: number;
}

interface HangerDB extends DBSchema {
  queue: {
    key: string;
    value: QueuedAction;
    indexes: { 'by-timestamp': number };
  };
}

const DB_NAME = 'hanger-liquor-offline';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<HangerDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<HangerDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('queue', { keyPath: 'id' });
        store.createIndex('by-timestamp', 'timestamp');
      },
    });
  }
  return dbPromise;
}

export async function enqueueAction(
  action: Omit<QueuedAction, 'id' | 'timestamp'>,
): Promise<QueuedAction> {
  const db = await getDb();
  const entry: QueuedAction = {
    ...action,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  await db.add('queue', entry);
  return entry;
}

export async function getQueuedActions(): Promise<QueuedAction[]> {
  const db = await getDb();
  return db.getAllFromIndex('queue', 'by-timestamp');
}

export async function getQueueCount(): Promise<number> {
  const db = await getDb();
  return db.count('queue');
}

export async function drainQueue(): Promise<QueuedAction[]> {
  const actions = await getQueuedActions();
  const db = await getDb();
  const tx = db.transaction('queue', 'readwrite');
  await Promise.all([...actions.map((a) => tx.store.delete(a.id)), tx.done]);
  return actions;
}

export async function clearQueue(): Promise<void> {
  const db = await getDb();
  await db.clear('queue');
}
