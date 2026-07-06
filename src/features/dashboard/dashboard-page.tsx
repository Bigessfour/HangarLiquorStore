import { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAddInventoryItem, useInventoryList } from '@/lib/api';
import { useCreateEvent } from '@/features/events/api/use-local-events';
import { useForecasts } from '@/features/forecast/api/use-forecasts';

// Demo-focused movers for the visual the user requested (exact Bud Light / Jack / Titos numbers).
// Stock values are enriched from live inventory when available.
const DEMO_MOVERS = [
  { name: 'Bud Light', sold: 47, upc: '018200000103' },
  { name: 'Jack Daniels', sold: 8, upc: '082184000012' },
  { name: 'Titos', sold: 31, upc: '619947000011' },
];

export function DashboardPage() {
  const { data: inventory = [] } = useInventoryList();
  const { data: forecasts = [] } = useForecasts(14);
  const addInventory = useAddInventoryItem();
  const createEvent = useCreateEvent();

  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const lowStockAlerts = useMemo(
    () => inventory.filter((item) => item.currentStock < (item.reorderPoint ?? 10)).slice(0, 3),
    [inventory]
  );

  const totalStock = useMemo(
    () => inventory.reduce((sum, i) => sum + i.currentStock, 0),
    [inventory]
  );
  const lowStockCount = lowStockAlerts.length;

  // Build chart data using the requested demo sold numbers + live stock lookup
  const chartData = useMemo(() => {
    return DEMO_MOVERS.map((m) => {
      const live = inventory.find((i) => i.upc === m.upc);
      return {
        item: m.name,
        sold: m.sold,
        stock: live ? live.currentStock : (m.name === 'Jack Daniels' ? 3 : m.name === 'Bud Light' ? 12 : 19),
      };
    });
  }, [inventory]);

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
    [forecasts]
  );

  const jackItem = inventory.find((i) => i.upc === '082184000012');

  const handleReorder = () => {
    // Real action: add 6 units via the canonical add hook (optimistic + persists in mock)
    addInventory.mutate(
      {
        upc: '082184000012',
        name: "Jack Daniel's Tennessee Whiskey 750ml",
        quantity: 6,
        category: 'Spirits',
      },
      {
        onSuccess: () => {
          setActionMessage('Added 6 × Jack Daniels to stock');
          setTimeout(() => setActionMessage(null), 2200);
        },
      }
    );
  };

  const handleApplyMultiplier = () => {
    // Real action: create the event using the canonical events system
    createEvent.mutate(
      {
        name: '4th of July Boost',
        startDate: '2026-07-04',
        endDate: '2026-07-06',
        multiplier: 1.35,
        notes: 'Beer focus — +35% expected demand',
      },
      {
        onSuccess: () => {
          setActionMessage('4th of July +35% multiplier event created');
          setTimeout(() => setActionMessage(null), 2200);
        },
      }
    );
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      <div>
        <h1 className="text-3xl font-bold">Hanger Liquor Store • Wiley, CO • Today</h1>
        <p className="text-sm text-muted-foreground">TanStack Query • Events • Offline ready</p>
      </div>

      {actionMessage && (
        <Alert className="border-green-500/40 bg-green-500/5">
          <AlertDescription className="font-medium text-green-600">{actionMessage}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 bg-card">
          <p className="text-sm text-hanger-amber">Total Stock</p>
          <p className="text-5xl font-bold">{totalStock}</p>
          <p className="text-sm text-green-600">↑ since yesterday</p>
        </Card>
        <Card className="p-4 bg-card">
          <p className="text-sm text-destructive">Low Items</p>
          <p className="text-5xl font-bold text-destructive">{lowStockCount}</p>
          <Button
            size="sm"
            variant="destructive"
            className="mt-2 text-xs"
            onClick={handleReorder}
            disabled={addInventory.isPending}
          >
            Reorder Jack Daniels
          </Button>
        </Card>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Top Movers • This week</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <XAxis dataKey="item" stroke="#888" />
            <YAxis />
            <Bar dataKey="sold" fill="#eab308" name="Sold" />
            <Bar dataKey="stock" fill="#666" name="Current Stock" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold">Smart Suggestions • Hanger Liquor</h3>

        <Button
          onClick={handleReorder}
          disabled={addInventory.isPending}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-lg active:scale-[0.985]"
        >
          Reorder 6 Jack Daniels • $89.94
        </Button>

        <Button
          onClick={handleApplyMultiplier}
          disabled={createEvent.isPending}
          className="w-full py-4 bg-amber-500 text-zinc-900 hover:bg-amber-400 rounded-xl text-lg active:scale-[0.985]"
        >
          Apply 4th of July +35% multiplier
        </Button>

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
              <Alert key={item.upc} className="border-rose-500/40 mb-2">
                <AlertTriangle className="h-4 w-4 text-rose-400" />
                <AlertDescription>
                  {item.name} — <strong>{item.currentStock} left</strong>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </div>

      <Card className="bg-card">
        <CardContent className="pt-4 text-sm text-muted-foreground">
          <p>📦 Bud Light 12pk: 47 sold • July boost expected</p>
          <p className="mt-1">🥃 Jack Daniels: low stock — reorder suggested by forecast</p>
        </CardContent>
      </Card>

      <p className="text-center text-xs opacity-60">
        TanStack Query • Real events + inventory mutations • 4thOfJulyBoost ready
      </p>
    </div>
  );
}
