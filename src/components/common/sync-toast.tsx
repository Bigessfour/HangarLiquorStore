import { useEffect } from 'react';
import { Cloud, CloudOff, Loader2 } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useOfflineQueueStore } from '@/stores/offline-queue-store';
import { cn } from '@/lib/utils';

export function SyncToast() {
  const isOnline = useOnlineStatus();
  const { queueCount, isSyncing, lastSyncMessage, refreshCount, syncQueue } = useOfflineQueueStore();

  useEffect(() => {
    void refreshCount();
  }, [refreshCount]);

  useEffect(() => {
    if (isOnline && queueCount > 0) {
      void syncQueue();
    }
  }, [isOnline, queueCount, syncQueue]);

  if (!lastSyncMessage && isOnline && queueCount === 0) return null;

  return (
    <div
      className={cn(
        'fixed left-4 right-4 top-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg',
        isOnline ? 'border-border bg-card' : 'border-hanger-amber/50 bg-hanger-amber/10',
      )}
      role="status"
      aria-live="polite"
    >
      {isSyncing ? (
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-hanger-amber" />
      ) : isOnline ? (
        <Cloud className="h-5 w-5 shrink-0 text-green-600" />
      ) : (
        <CloudOff className="h-5 w-5 shrink-0 text-hanger-amber" />
      )}
      <span className="flex-1">
        {!isOnline
          ? `Offline — ${queueCount} action${queueCount !== 1 ? 's' : ''} queued`
          : lastSyncMessage}
      </span>
    </div>
  );
}