import { Outlet } from 'react-router-dom';
import { BottomNav } from '@/components/common/bottom-nav';
import { ScanBottleFab } from '@/components/common/scan-bottle-fab';
import { SyncToast } from '@/components/common/sync-toast';
import { ThemeToggle } from '@/components/common/theme-toggle';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Wiley, CO
          </p>
          <h1 className="text-base font-bold leading-tight">Hanger Liquor Store</h1>
        </div>
        <ThemeToggle />
      </header>

      <SyncToast />

      <main className="mx-auto max-w-lg pb-36 pt-2">
        <Outlet />
      </main>

      <ScanBottleFab />
      <BottomNav />
    </div>
  );
}