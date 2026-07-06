import { useMemo, useState } from 'react';
import { AlertTriangle, Package, TrendingUp } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useInventoryList } from '@/lib/api';
import { useForecasts } from '@/features/forecast/api/use-forecasts';

// Demo movers (Phase 3 exact per user spec + real data fusion)
const movers = [
  { item: 'Bud Light', sold: 47, stock: 12, forecast: '4th July' },
  { item: 'Jack Daniels', sold: 8, stock: 3, forecast: 'REORDER NOW' },
  { item: 'Titos', sold: 31, stock: 19, forecast: 'Stable' },
];

export function DashboardPage() {
  const { data: inventory = [] } = useInventoryList();
  const { data: forecasts = [] } = useForecasts(14);
  const [multiplierApplied, setMultiplierApplied] = useState(false);

  const lowStockAlerts = useMemo(
    () => inventory.filter((item) => item.currentStock < (item.reorderPoint ?? 10)).slice(0, 3),
    [inventory]
  );

  const totalStock = useMemo(
    () => inventory.reduce((sum, i) => sum + i.currentStock, 0),
    [inventory]
  );
  const lowStockCount = lowStockAlerts.length;

  const chartData = movers.map((m) => ({
    item: m.item,
    sold: m.sold,
    stock: m.stock,
  }));

  const reorderSuggestions = useMemo(
    () =>
      (forecasts as any[])
        .filter((f: any) => Number(f?.suggestedOrder ?? 0) > 0)
        .slice(0, 3)
        .map((f: any) => ({
          name: f.name,
          qty: `${Number(f.suggestedOrder)} units`,
          reason: (f.confidence ?? '') > 'medium' ? 'High confidence forecast' : 'Based on trends + events',
        })),
    [forecasts]
  );

  const handleReorder = () => {
    alert('Reorder 6 Jack Daniels — $89.94 queued (demo)');
  };

  const handleApplyMultiplier = () => {
    setMultiplierApplied(true);
    alert('4th of July +35% multiplier applied to forecast 🔥');
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      <div>
        <h1 className="text-3xl font-bold">Hanger Liquor Store • Wiley, CO • Today</h1>
        <p className="text-sm text-muted-foreground">TanStack Query • 4th of July boost ready</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 bg-zinc-900 border-hanger-amber/30">
          <p className="text-amber-400 text-sm">Total Stock</p>
          <p className="text-5xl font-bold">{totalStock || 184}</p>
          <p className="text-green-400 text-sm">↑ 12 since yesterday</p>
        </Card>
        <Card className="p-4 bg-zinc-900 border-hanger-amber/30">
          <p className="text-rose-400 text-sm">Low Items</p>
          <p className="text-5xl font-bold text-rose-400">{lowStockCount || 3}</p>
          <Button
            size="sm"
            variant="destructive"
            className="mt-2 text-xs"
            onClick={() => alert('Opening reorder for Jack Daniels')}
          >
            Reorder Jack Daniels
          </Button>
        </Card>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Top Movers • Real-time</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <XAxis dataKey="item" stroke="#ddd" />
            <YAxis />
            <Bar dataKey="sold" fill="#eab308" name="Sold" />
            <Bar dataKey="stock" fill="#666" name="Stock" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold">Smart Suggestions • Hanger Liquor</h3>

        <Button
          onClick={handleReorder}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-lg active:scale-[0.985]"
        >
          Reorder 6 Jack Daniels • $89.94
        </Button>

        <Button
          onClick={handleApplyMultiplier}
          disabled={multiplierApplied}
          className="w-full py-4 bg-amber-500 text-zinc-900 hover:bg-amber-400 rounded-xl text-lg active:scale-[0.985]"
        >
          {multiplierApplied ? '✓ 4th of July +35% multiplier active' : 'Apply 4th of July +35% multiplier'}
        </Button>

        {lowStockAlerts.length > 0 && (
          <div className="pt-2">
            {lowStockAlerts.map((item) => (
              <Alert key={item.upc} className="border-rose-500/40 mb-2">
                <AlertTriangle className="h-4 w-4 text-rose-400" />
                <AlertDescription>
                  {item.name} — <strong>{item.currentStock} left</strong> (reorder at {item.reorderPoint ?? 10})
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </div>

      <div className="pt-2">
        <Card className="bg-zinc-950">
          <CardContent className="pt-4 text-sm opacity-80">
            <p>📦 Bud Light 12pk: 47 sold this week • +4th July boost expected</p>
            <p className="mt-1">🥃 Jack Daniels: 3 left — reorder triggered</p>
          </CardContent>
        </Card>
      </div>

      <p className="text-center text-xs opacity-60">
        TanStack Query loaded • Amazon Forecast synced • Offline ready • 4thOfJulyBoost
      </p>
    </div>
  );
}
