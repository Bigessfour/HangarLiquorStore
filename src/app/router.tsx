import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/app/layout';
import { DashboardPage } from '@/features/dashboard/dashboard-page';
import { EventsPage } from '@/features/events/events-page';
import { InventoryPage } from '@/features/inventory/inventory-page';
import { MorePage } from '@/features/more/more-page';
import { SuggestionsPage } from '@/features/suggestions/suggestions-page';
import { Skeleton } from '@/components/ui/skeleton';

const ScanPage = lazy(() =>
  import('@/features/scan/scan-page').then((m) => ({ default: m.ScanPage })),
);

const ForecastDashboard = lazy(() =>
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
      {
        path: 'scan',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <ScanPage />
          </Suspense>
        ),
      },
      { path: 'inventory', element: <InventoryPage /> },
      { path: 'suggestions', element: <SuggestionsPage /> },
      { path: 'more', element: <MorePage /> },
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
