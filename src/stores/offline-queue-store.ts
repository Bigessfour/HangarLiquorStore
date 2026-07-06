import { create } from 'zustand';
import { inventoryKeys, syncOfflineActions } from '@/lib/api';
import { queryClient } from '@/lib/query-client';
import {
  drainQueue,
  enqueueAction,
  getQueueCount,
  getQueuedActions,
  type QueuedAction,
} from '@/pwa/offline-queue';
import type { ScanAddItemInput } from '@/types/inventory';

interface OfflineQueueState {
  queueCount: number;
  isSyncing: boolean;
  lastSyncMessage: string | null;
  refreshCount: () => Promise<void>;
  queueAddItem: (input: ScanAddItemInput) => Promise<void>;
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

  queueAddItem: async (input) => {
    await enqueueAction({
      type: 'add',
      payload: {
        upc: input.upc,
        quantity: input.quantity,
        name: input.name,
        category: input.category,
      },
    });
    await get().refreshCount();
    set({ lastSyncMessage: `Queued +${input.quantity} for ${input.name}` });
  },

  syncQueue: async () => {
    const count = await getQueueCount();
    if (count === 0) return;

    set({
      isSyncing: true,
      lastSyncMessage: `Syncing ${count} queued action${count > 1 ? 's' : ''}...`,
    });

    try {
      const actions: QueuedAction[] = await getQueuedActions();
      const result = await syncOfflineActions(actions);
      await drainQueue();
      await queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      set({
        queueCount: 0,
        lastSyncMessage: `Synced ${result.synced} action${result.synced !== 1 ? 's' : ''}`,
      });
    } catch {
      await get().refreshCount();
      set({ lastSyncMessage: 'Sync failed — will retry when online' });
    } finally {
      set({ isSyncing: false });
    }
  },
}));
