import { create } from 'zustand';
import { drainQueue, enqueueAction, getQueueCount, type QueuedAction } from '@/pwa/offline-queue';

interface OfflineQueueState {
  queueCount: number;
  isSyncing: boolean;
  lastSyncMessage: string | null;
  refreshCount: () => Promise<void>;
  addScan: (upc: string, productName: string) => Promise<void>;
  syncQueue: () => Promise<void>;
}

export const useOfflineQueueStore = create<OfflineQueueState>((set, get) => ({
  queueCount: 0,
  isSyncing: false,
  lastSyncMessage: null,

  refreshCount: async () => {
    const count = await getQueueCount();
    set({ queueCount: count });
  },

  addScan: async (upc, productName) => {
    await enqueueAction({ type: 'scan', payload: { upc, delta: -1, productName } });
    await get().refreshCount();
    set({ lastSyncMessage: `Queued scan: ${productName}` });
  },

  syncQueue: async () => {
    const count = await getQueueCount();
    if (count === 0) return;

    set({ isSyncing: true, lastSyncMessage: `Syncing ${count} queued action${count > 1 ? 's' : ''}...` });

    try {
      const actions: QueuedAction[] = await drainQueue();
      // TODO: POST batch to /api/inventory/sync when backend endpoint is ready
      console.info('Synced offline actions:', actions);
      set({ queueCount: 0, lastSyncMessage: `Synced ${actions.length} action${actions.length > 1 ? 's' : ''}` });
    } catch {
      set({ lastSyncMessage: 'Sync failed — will retry' });
    } finally {
      set({ isSyncing: false });
    }
  },
}));