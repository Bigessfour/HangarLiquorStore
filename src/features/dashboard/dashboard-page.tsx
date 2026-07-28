import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarPlus, Turtle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAddInventoryItem, useInventoryList } from '@/lib/api';
import { useCreateEvent, useLocalEvents } from '@/features/events/api/use-local-events';
import { EventFormDialog } from '@/features/events/components/event-form-dialog';
import { hasRole } from '@/lib/auth';
import { useForecasts } from '@/features/forecast/api/use-forecasts';
import { SquareDashboardCard } from '@/components/common/square-dashboard-card';
import { fetchProfitOps } from '@/lib/profit-api';
import { buildHolidayStockingSuggestions } from '@/lib/holiday-stocking';
import TrendingSuggestions from './trending-suggestions';

export function DashboardPage() {
  const { data: inventory = [] } = useInventoryList();
  const { data: forecasts = [] } = useForecasts(14);
  const { data: eventsData } = useLocalEvents();
  const addInventory = useAddInventoryItem();
  const createEvent = useCreateEvent();

  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);

  const { data: profit } = useQuery({
    queryKey: ['profit', 'month', 'dashboard'],
    queryFn: () => fetchProfitOps('month'),
    enabled: hasRole('Manager'),
  });

  const lowStockAlerts = useMemo(
    () => inventory.filter((item) => item.currentStock < (item.reorderPoint ?? 10)).slice(0, 3),
    [inventory],
  );

  const totalStock = useMemo(
    () => inventory.reduce((sum, i) => sum + i.currentStock, 0),
    [inventory],
  );
  const lowStockCount = lowStockAlerts.length;

  const slowMovers = useMemo(
    () =>
      (profit?.optimization.recommendations ?? [])
        .filter(
          (r) =>
            r.upc !== 'event' &&
            (r.action === 'hold' || r.action === 'promote') &&
            (r.cashTiedUp ?? r.dollarsImpact) > 0,
        )
        .slice(0, 3),
    [profit],
  );

  const nextHoliday = useMemo(() => {
    const list = buildHolidayStockingSuggestions({
      inventory,
      forecasts,
      staticHolidays: eventsData?.staticHolidays ?? [],
      localEvents: eventsData?.localEvents ?? [],
      maxHolidays: 1,
    });
    return list[0];
  }, [inventory, forecasts, eventsData]);

  const chartData = useMemo(() => {
    if (!forecasts.length) return [];
    return [...forecasts]
      .sort((a, b) => b.predictedDemand14d - a.predictedDemand14d)
      .slice(0, 3)
      .map((f) => {
        const inv = inventory.find((i) => i.upc === f.upc);
        const shortName = f.name.replace(/\s(12pk.*|750ml|1L).*$/, '').trim();
        return {
          item: shortName,
          demand: f.predictedDemand14d,
          stock: inv?.currentStock ?? 0,
        };
      });
  }, [forecasts, inventory]);

  const reorderSuggestions = useMemo(
    () =>
      forecasts
        .filter((f) => f.suggestedOrder > 0)
        .slice(0, 3)
        .map((f) => ({
          name: f.name,
          qty: `${f.suggestedOrder} units`,
          reason: f.confidence === 'high' ? 'High confidence forecast' : 'Based on trends + events',
        })),
    [forecasts],
  );

  const activeMultiplier = (eventsData?.localEvents ?? []).find((e) =>
    /july|4th|boost|rodeo|hunt|hay/i.test(e.name),
  );

  const handleReorder = () => {
    const target = lowStockAlerts[0] || reorderSuggestions[0];
    if (!target) return;
    const upc = (target as { upc?: string }).upc;
    const name = (target as { name?: string }).name;
    const qty =
      (target as { suggestedOrder?: number }).suggestedOrder ||
      ((target as { currentStock?: number }).currentStock ? 1 : 6);
    if (!upc || !name) return;
    addInventory.mutate(
      {
        upc,
        name,
        quantity: qty,
        category: (target as { category?: string }).category || 'Spirits',
        packSize: (target as { packSize?: number }).packSize || 1,
      } as never,
      {
        onSuccess: () => {
          setActionMessage(`Added ${qty} × ${name} to stock`);
          setTimeout(() => setActionMessage(null), 2200);
        },
      },
    );
  };

  const handleApplyMultiplier = () => {
    const eventName = activeMultiplier?.name || 'Demand Boost';
    const mult = activeMultiplier?.multiplier || 1.35;
    createEvent.mutate(
      {
        name: eventName,
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
        multiplier: mult,
        notes: 'From dashboard action',
        focuses: activeMultiplier?.focuses,
      },
      {
        onSuccess: () => {
          setActionMessage(`${eventName} event created`);
          setTimeout(() => setActionMessage(null), 2200);
        },
      },
    );
  };

  return (
    <div className="space-y-6 p-4 pb-24">
      <div>
        <h1 className="text-3xl font-bold" data-tour="tour-dashboard">
          Hangar Liquor Store · Wiley, CO · Today
        </h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Live forecast · holidays + local events</span>
          {activeMultiplier && (
            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
              {activeMultiplier.name} active
            </span>
          )}
        </div>
      </div>

      {actionMessage && (
        <Alert className="border-green-500/40 bg-green-500/5">
          <AlertDescription className="font-medium text-green-600">{actionMessage}</AlertDescription>
        </Alert>
      )}

      <SquareDashboardCard />

      {nextHoliday && (
        <Link
          to="/suggestions"
          className="block rounded-lg border border-hanger-amber/40 bg-hanger-amber/10 px-3 py-3 text-sm"
          data-testid="dashboard-holiday-stocking"
        >
          <p className="font-semibold text-foreground">
            Stock up: {nextHoliday.holidayName} in {nextHoliday.daysUntil}d (×
            {nextHoliday.multiplier})
          </p>
          <p className="mt-1 text-muted-foreground">{nextHoliday.stockingNote}</p>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card className="border-hanger-amber/20 bg-gradient-to-br from-card to-hanger-amber/5 p-4 shadow-sm transition-all hover:shadow-md">
          <p className="text-sm text-hanger-amber">Total Stock</p>
          <p className="text-5xl font-bold">{totalStock}</p>
          <p className="text-sm text-green-600">Live inventory</p>
        </Card>
        <Card className="border-destructive/20 bg-gradient-to-br from-card to-destructive/5 p-4 shadow-sm transition-all hover:shadow-md">
          <p className="text-sm text-destructive">Low Items</p>
          <p className="text-5xl font-bold text-destructive">{lowStockCount}</p>
          <Button
            size="sm"
            variant="destructive"
            className="mt-2 text-xs"
            onClick={handleReorder}
            disabled={addInventory.isPending}
          >
            Reorder {lowStockAlerts[0]?.name?.split(' ')[0] || 'Low Stock'}
          </Button>
        </Card>
      </div>

      {slowMovers.length > 0 && (
        <div className="space-y-2" data-testid="dashboard-slow-movers">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold">
              <Turtle className="h-4 w-4 text-muted-foreground" aria-hidden />
              Slow movers · cash tied up
            </h3>
            <Link to="/profit" className="text-xs text-hanger-amber hover:underline">
              Profit →
            </Link>
          </div>
          {slowMovers.map((r) => (
            <div key={r.upc} className="rounded-lg border border-border bg-card p-3 text-sm">
              <div className="flex justify-between gap-2">
                <span className="font-medium capitalize">
                  {r.action}: {r.name}
                </span>
                <span className="tabular-nums text-hanger-amber">
                  ${r.cashTiedUp ?? r.dollarsImpact}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{r.reason}</p>
            </div>
          ))}
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold">Top Movers · Live from Forecast</h3>
          <Link to="/forecast" className="text-xs text-hanger-amber hover:underline">
            View full report →
          </Link>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <XAxis dataKey="item" stroke="#888" />
            <YAxis />
            <Bar dataKey="demand" fill="#eab308" name="Expected Demand (14d)" />
            <Bar dataKey="stock" fill="#666" name="Current Stock" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold">Smart Suggestions</h3>

        {hasRole('Manager') ? (
          <Button
            onClick={handleReorder}
            disabled={addInventory.isPending}
            className="w-full rounded-xl bg-emerald-600 py-4 text-lg hover:bg-emerald-500 active:scale-[0.985]"
          >
            Reorder{' '}
            {lowStockAlerts[0]?.name?.split(' ')[0] ||
              reorderSuggestions[0]?.name?.split(' ')[0] ||
              'Stock'}{' '}
            · from live data
          </Button>
        ) : null}

        {hasRole('Manager') ? (
          <Button
            type="button"
            onClick={() => setEventDialogOpen(true)}
            className="min-h-12 w-full rounded-xl bg-hanger-amber py-4 text-lg text-primary-foreground hover:bg-hanger-amber/90 active:scale-[0.985]"
            data-testid="dashboard-add-local-event"
          >
            <CalendarPlus className="mr-2 h-5 w-5" aria-hidden />
            Add local event
          </Button>
        ) : null}

        {hasRole('Manager') ? (
          <Button
            onClick={handleApplyMultiplier}
            disabled={createEvent.isPending}
            className="w-full rounded-xl bg-amber-500 py-4 text-lg text-zinc-900 hover:bg-amber-400 active:scale-[0.985]"
          >
            Apply {activeMultiplier?.name || 'Event'} multiplier
          </Button>
        ) : null}

        {reorderSuggestions.length > 0 && (
          <div className="space-y-2 pt-1">
            {reorderSuggestions.map((sug, idx) => (
              <div key={idx} className="rounded-lg border border-border bg-card p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{sug.name}</span>
                  <span className="text-hanger-amber">{sug.qty}</span>
                </div>
                <p className="text-xs text-muted-foreground">{sug.reason}</p>
              </div>
            ))}
          </div>
        )}

        {lowStockAlerts.length > 0 && (
          <div className="pt-1">
            {lowStockAlerts.map((item) => (
              <Alert key={item.upc} className="mb-2 border-rose-500/40">
                <AlertTriangle className="h-4 w-4 text-rose-400" />
                <AlertDescription>
                  {item.name} — <strong>{item.currentStock} left</strong>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </div>

      <TrendingSuggestions />

      <Card className="border-hanger-gold/20 bg-card">
        <CardContent className="pt-4 text-sm text-muted-foreground">
          {chartData[0] && (
            <p>
              {chartData[0].item}: {chartData[0].demand} expected demand (14d)
            </p>
          )}
          <p className="mt-1">
            {activeMultiplier
              ? `${activeMultiplier.name} active (+${Math.round((activeMultiplier.multiplier - 1) * 100)}% boost)`
              : 'Add a local event for festivals/hunting — national holidays stock automatically.'}
          </p>
        </CardContent>
      </Card>

      <EventFormDialog open={eventDialogOpen} onOpenChange={setEventDialogOpen} />
    </div>
  );
}
