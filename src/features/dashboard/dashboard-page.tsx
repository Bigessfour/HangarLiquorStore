import { useMemo } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, Package, TrendingUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useInventoryList } from '@/lib/api';
import { useForecasts } from '@/features/forecast/api/use-forecasts';

export function DashboardPage() {
  const { data: inventory = [] } = useInventoryList();
  const { data: forecasts = [] } = useForecasts(14);

  const lowStockAlerts = useMemo(() => 
    inventory.filter(item => item.currentStock < item.reorderPoint).slice(0, 3),
    [inventory]
  );

  const reorderSuggestions = useMemo(() => 
    forecasts
      .filter(f => f.suggestedOrder > 0)
      .slice(0, 3)
      .map(f => ({
        name: f.name,
        qty: `${f.suggestedOrder} units`,
        reason: f.confidence > 0.7 ? 'High confidence forecast' : 'Based on trends + events'
      })),
    [forecasts]
  );

  const totalSKUs = inventory.length;
  const lowStockCount = lowStockAlerts.length;

  // Mock movers from inventory for now (can enhance with sales history later)
  const fastMovers = inventory.slice(0, 2).map(item => ({
    name: item.name,
    weekly: Math.floor(item.currentStock * 0.3) + 10,
    category: item.category.toLowerCase()
  }));
  const slowMovers = inventory.slice(-1).map(item => ({
    name: item.name,
    weekly: Math.floor(item.currentStock * 0.05),
    category: item.category.toLowerCase()
  }));

  return (
    <div className="space-y-4 p-4">
      <div>
        <h2 className="text-2xl font-bold">Good afternoon!</h2>
        <p className="text-muted-foreground">Here&apos;s your store at a glance.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Package className="h-4 w-4" /> Total SKUs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalSKUs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Low Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{lowStockCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUp className="h-5 w-5 text-green-600" /> Fast Movers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {fastMovers.map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-2">
              <div>
                <p className="font-medium">{item.name}</p>
                <Badge variant="secondary" className="mt-1 capitalize">
                  {item.category}
                </Badge>
              </div>
              <span className="text-sm font-semibold text-green-600">{item.weekly}/wk</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowDown className="h-5 w-5 text-muted-foreground" /> Slow Movers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {slowMovers.map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-2">
              <p className="font-medium">{item.name}</p>
              <span className="text-sm text-muted-foreground">{item.weekly}/wk</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Low-Stock Alerts</h3>
        {lowStockAlerts.length > 0 ? lowStockAlerts.map((item) => (
          <Alert key={item.name} className="border-destructive/30">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <AlertDescription className="font-medium">
              {item.name} — <strong>{item.currentStock} left</strong>
              <span className="block text-sm text-muted-foreground">
                Reorder at {item.reorderPoint}
              </span>
            </AlertDescription>
          </Alert>
        )) : <p className="text-sm text-muted-foreground">No low stock alerts.</p>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-hanger-amber" /> Reorder Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {reorderSuggestions.length > 0 ? reorderSuggestions.map((item) => (
            <div key={item.name} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{item.name}</p>
                <Badge variant="warning">{item.qty}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{item.reason}</p>
            </div>
          )) : <p className="text-sm text-muted-foreground">No reorder suggestions yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
