import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNav } from '@/components/common/bottom-nav';
import { ErrorBoundary } from '@/components/common/error-boundary';
import { ScanBottleFab } from '@/components/common/scan-bottle-fab';
import { SyncToast } from '@/components/common/sync-toast';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { Skeleton } from '@/components/ui/skeleton';
import { useOnlineStatus } from '@/hooks/use-online-status';

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Wiley, CO
          </p>
          <h1 className="text-base font-bold leading-tight">Hanger Liquor Store</h1>
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
          <ThemeToggle />
        </div>
      </header>

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
    </div>
  );
}
