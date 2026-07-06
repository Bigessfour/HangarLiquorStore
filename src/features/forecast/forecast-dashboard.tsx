import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EventBadgeList } from '@/features/events/components/event-badge-list';
import { EventFormDialog } from '@/features/events/components/event-form-dialog';
import { useLocalEvents } from '@/features/events/api/use-local-events';
import { useForecasts } from '@/features/forecast/api/use-forecasts';
import { ForecastChart } from '@/features/forecast/components/forecast-chart';
import { ForecastItemTable } from '@/features/forecast/components/forecast-item-table';
import { ForecastSummaryCards } from '@/features/forecast/components/forecast-summary-cards';
import type { ItemForecast } from '@/types/forecast';

export function ForecastDashboard() {
  const [searchParams] = useSearchParams();
  const upcFromQuery = searchParams.get('upc');
  const [selectedItem, setSelectedItem] = useState<ItemForecast | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);

  const { data: forecasts = [], isLoading, error } = useForecasts(14);
  const { data: eventsData } = useLocalEvents();

  const localEvents = eventsData?.localEvents ?? [];
  const staticHolidays = eventsData?.staticHolidays ?? [];

  useEffect(() => {
    if (!upcFromQuery || forecasts.length === 0) return;
    const match = forecasts.find((item) => item.upc === upcFromQuery);
    if (match) {
      setSelectedItem(match);
      setActiveTab('detail');
    }
  }, [upcFromQuery, forecasts]);

  const reorderCount = useMemo(
    () => forecasts.filter((item) => item.suggestedOrder > 0).length,
    [forecasts],
  );

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertDescription>
          Failed to load forecasts
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 pb-20">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Demand Forecast</h1>
          <p className="text-slate-500">Next 14 days • Hanger Liquor Store</p>
        </div>
        <Button
          size="sm"
          onClick={() => setIsEventDialogOpen(true)}
          className="min-h-10"
        >
          + Add Local Event
        </Button>
        <EventFormDialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen} />
      </div>

      <EventBadgeList localEvents={localEvents} staticHolidays={staticHolidays} />

      <ForecastSummaryCards totalItems={forecasts.length} reorderCount={reorderCount} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid h-12 w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="detail">Item Detail</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Items Requiring Attention (Next 14 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              {forecasts.length === 0 ? (
                <p className="py-8 text-center text-slate-500">
                  No forecast data yet. Add inventory and sales history to get started.
                </p>
              ) : (
                <ForecastItemTable
                  forecasts={forecasts}
                  onSelect={(item) => {
                    setSelectedItem(item);
                    setActiveTab('detail');
                  }}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detail">
          {!selectedItem ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-500">
                Select an item from the Overview tab to see detailed forecast and chart
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{selectedItem.name}</CardTitle>
                      <p className="text-sm text-slate-500">
                        {selectedItem.upc} • {selectedItem.category}
                      </p>
                    </div>
                    <Badge variant={selectedItem.confidence === 'high' ? 'default' : 'secondary'}>
                      {selectedItem.confidence} confidence
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-6 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-3xl font-semibold">{selectedItem.currentStock}</div>
                      <div className="text-xs text-slate-500">Current Stock</div>
                    </div>
                    <div>
                      <div className="text-3xl font-semibold text-blue-600">
                        {selectedItem.predictedDemand14d}
                      </div>
                      <div className="text-xs text-slate-500">Predicted Demand (14d)</div>
                    </div>
                    <div>
                      <div className="text-3xl font-semibold text-emerald-600">
                        {selectedItem.suggestedOrder}
                      </div>
                      <div className="text-xs text-slate-500">Suggested Order</div>
                    </div>
                  </div>

                  <ForecastChart data={selectedItem.chartData} />
                  <p className="mt-2 text-center text-xs text-slate-500">
                    Orange = predicted demand (includes local events & holidays)
                  </p>
                </CardContent>
              </Card>

              <Button
                variant="outline"
                className="h-12 w-full"
                onClick={() => {
                  setSelectedItem(null);
                  setActiveTab('overview');
                }}
              >
                Back to Overview
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
