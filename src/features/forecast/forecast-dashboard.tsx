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
  const [model, setModel] = useState<'statistical' | 'canvas'>('statistical');

  const { data: forecasts = [], isLoading, error } = useForecasts(14, model);
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
    () => (forecasts as any[]).filter((item: any) => Number(item?.suggestedOrder ?? 0) > 0).length,
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
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-hanger-amber via-hanger-gold to-hanger-amber bg-clip-text text-transparent">
            Demand Forecast
          </h1>
          <p className="text-slate-500">Next 14 days • Hanger Liquor Store</p>
          <div className="mt-1 flex items-center gap-2">
            <Badge 
              variant="outline" 
              className="border-hanger-amber/50 text-hanger-amber bg-hanger-amber/5 text-[10px] font-medium"
            >
              {model === 'canvas' ? 'AWS SageMaker Canvas' : 'Statistical Engine'}
            </Badge>
            {model === 'canvas' && (
              <span className="text-[10px] text-muted-foreground">High-accuracy ML model</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={model === 'canvas' ? 'default' : 'outline'}
            onClick={() => setModel(model === 'statistical' ? 'canvas' : 'statistical')}
            className={`min-h-10 text-xs transition-all ${model === 'canvas' ? 'bg-gradient-to-r from-hanger-gold to-hanger-amber text-white shadow-sm' : 'border-hanger-amber/50 hover:border-hanger-amber'}`}
            title="Toggle between statistical engine and AWS SageMaker Canvas (high-accuracy)"
          >
            {model === 'canvas' ? 'Switch to Statistical' : 'Use SageMaker Canvas'}
          </Button>
          <Button
            size="sm"
            onClick={() => setIsEventDialogOpen(true)}
            className="min-h-10"
          >
            + Add Local Event
          </Button>
        </div>
        <EventFormDialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen} />
      </div>

      <EventBadgeList localEvents={localEvents} staticHolidays={staticHolidays} />

      <ForecastSummaryCards totalItems={forecasts.length} reorderCount={reorderCount} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid h-12 w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="detail">Item Detail</TabsTrigger>
        </TabsList>

        {model === 'canvas' && (
          <div className="rounded-lg border border-hanger-gold/30 bg-gradient-to-r from-hanger-gold/10 via-hanger-amber/5 to-transparent p-3 text-xs flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-hanger-gold animate-pulse" />
            <span>
              <strong>Premium:</strong> Powered by AWS SageMaker Canvas — custom ML model trained on your sales history for superior accuracy.
            </span>
          </div>
        )}

        <TabsContent value="overview">
          <Card className="border-hanger-amber/20 shadow-sm transition-all hover:shadow-md">
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
              <Card className="border-hanger-gold/20 shadow-sm transition-all hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{selectedItem.name}</CardTitle>
                      <p className="text-sm text-slate-500">
                        {selectedItem.upc} • {selectedItem.category}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={selectedItem.confidence === 'high' ? 'default' : 'secondary'}>
                        {selectedItem.confidence} confidence
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={selectedItem.source === 'sagemaker' 
                          ? 'border-hanger-gold/60 text-hanger-gold bg-hanger-gold/5 text-[10px] font-medium' 
                          : 'text-[10px]'}
                      >
                        {selectedItem.source === 'sagemaker' ? 'AWS SageMaker Canvas' : 'Statistical'}
                      </Badge>
                    </div>
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
