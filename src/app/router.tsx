import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/app/layout';
import { DashboardPage } from '@/features/dashboard/dashboard-page';
import { InventoryPage } from '@/features/inventory/inventory-page';
import { ScanPage } from '@/features/scan/scan-page';
import { EventsPage } from '@/features/events/events-page';
import { Skeleton } from '@/components/ui/skeleton';

const ForecastDashboard = lazy(
  () =>
    import('@/features/forecast/forecast-dashboard').then((m) => ({
      default: m.ForecastDashboard,
    })),
);

function RouteFallback() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'scan', element: <ScanPage /> },
      { path: 'inventory', element: <InventoryPage /> },
      { path: 'events', element: <EventsPage /> },
      {
        path: 'reports',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <ForecastDashboard />
          </Suspense>
        ),
      },
      {
        path: 'forecast',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <ForecastDashboard />
          </Suspense>
        ),
      },
    ],
  },
]);