import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import { BottomNav } from '@/components/common/bottom-nav';
import { ErrorBoundary } from '@/components/common/error-boundary';
import { DemoPhoneBanner } from '@/components/common/demo-phone-banner';
import { ScanBottleFab } from '@/components/common/scan-bottle-fab';
import { SyncToast } from '@/components/common/sync-toast';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { Skeleton } from '@/components/ui/skeleton';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useOfflineQueueStore } from '@/stores/offline-queue-store';
import { InstallAppBanner } from '@/components/common/install-app-banner';
import { GuidedTrialHost } from '@/features/guided-trial';

function PageFallback() {
  return (
    <div className="space-y-4 p-4" aria-busy="true" aria-label="Loading page">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

export function AppLayout() {
  const isOnline = useOnlineStatus();
  const { queueCount, lastSyncMessage } = useOfflineQueueStore();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-hanger-amber/20 bg-gradient-to-r from-background via-card to-background px-4 backdrop-blur">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Wiley, CO
          </p>
          <h1 className="text-base font-bold leading-tight bg-gradient-to-r from-hanger-amber to-hanger-gold bg-clip-text text-transparent">Hanger Liquor Store</h1>
        </div>
        <div className="flex items-center gap-2">
          {!isOnline && (
            <span
              className="rounded-full bg-hanger-amber/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-hanger-amber"
              role="status"
            >
              Offline
            </span>
          )}
          {queueCount > 0 && (
            <span
              className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-600"
              role="status"
              title={lastSyncMessage || undefined}
            >
              Queued {queueCount}
            </span>
          )}
          {queueCount === 0 && isOnline && lastSyncMessage?.includes('Synced') && (
            <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-green-600" role="status">
              Synced
            </span>
          )}
          <ThemeToggle />
        </div>
      </header>

      <DemoPhoneBanner />

      <InstallAppBanner />

      <SyncToast />

      <main className="mx-auto max-w-lg pb-36 pt-2">
        <ErrorBoundary>
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>

      <ScanBottleFab />
      <BottomNav />
      <GuidedTrialHost />
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}
