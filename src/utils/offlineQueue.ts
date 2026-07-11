import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'jflips_offline_db';
const STORE_NAME = 'offline_queue';
const DB_VERSION = 1;

export interface QueuedSession {
  id: string;
  payload: any;
  queued_at: string;
  status: 'pending' | 'synced' | 'failed';
  error?: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

export const addToQueue = async (payload: any) => {
  const db = await getDB();
  const item: QueuedSession = {
    id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    payload,
    queued_at: new Date().toISOString(),
    status: 'pending',
  };
  await db.put(STORE_NAME, item);
  return item;
};

export const getPendingItems = async (): Promise<QueuedSession[]> => {
  const db = await getDB();
  const items = await db.getAll(STORE_NAME);
  return items.filter((item: QueuedSession) => item.status === 'pending');
};

export const getAllItems = async (): Promise<QueuedSession[]> => {
  const db = await getDB();
  return db.getAll(STORE_NAME);
};

export const updateItemStatus = async (id: string, status: 'synced' | 'failed' | 'pending', error?: string) => {
  const db = await getDB();
  const item = await db.get(STORE_NAME, id);
  if (item) {
    item.status = status;
    if (status === 'pending') {
      delete item.error;
    } else if (error) {
      item.error = error;
    }
    await db.put(STORE_NAME, item);
  }
};

export const deleteSyncedItems = async () => {
  const db = await getDB();
  const items = await db.getAll(STORE_NAME);
  const tx = db.transaction(STORE_NAME, 'readwrite');
  for (const item of items) {
    if (item.status === 'synced') {
      await tx.store.delete(item.id);
    }
  }
  await tx.done;
};
