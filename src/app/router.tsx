import { lazy, Suspense } from 'react';
import { createBrowserRouter, Link, Outlet } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

const ForecastDashboard = lazy(
  () => import('@/features/forecast/forecast-dashboard').then((m) => ({
    default: m.ForecastDashboard,
  })),
);

function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Outlet />
      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-4xl grid-cols-2">
          <Link
            to="/"
            className="flex h-16 items-center justify-center text-sm font-medium text-slate-600"
          >
            Home
          </Link>
          <Link
            to="/forecast"
            className="flex h-16 items-center justify-center text-sm font-medium text-slate-900"
          >
            Forecast
          </Link>
        </div>
      </nav>
    </div>
  );
}

function HomePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 pb-24">
      <h1 className="text-3xl font-bold">Hanger Liquor Store</h1>
      <p className="text-slate-600">Mobile inventory optimization for Wiley, CO.</p>
      <Link
        to="/forecast"
        className="inline-flex h-12 items-center rounded-lg bg-slate-900 px-6 text-white"
      >
        Open Demand Forecast
      </Link>
    </div>
  );
}

function RouteFallback() {
  return (
    <div className="p-4 space-y-4">
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
      { index: true, element: <HomePage /> },
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