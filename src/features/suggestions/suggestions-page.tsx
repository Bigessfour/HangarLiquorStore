import { Lightbulb, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useForecasts } from '@/features/forecast/api/use-forecasts';
import { useInventoryList } from '@/lib/api';

export function SuggestionsPage() {
  const { data: forecasts = [] } = useForecasts(14);
  const { data: inventory = [] } = useInventoryList();

  const suggestions = forecasts
    .filter(f => f.suggestedOrder > 0)
    .slice(0, 5)
    .map(f => {
      const item = inventory.find(i => i.upc === f.upc);
      const reasonParts = [];
      if (f.confidence > 0.75) reasonParts.push('High confidence');
      if (f.chartData.some(d => d.event)) reasonParts.push('Event boost');
      return {
        name: f.name,
        qty: `${f.suggestedOrder} units`,
        reason: reasonParts.length ? reasonParts.join(' + ') : 'Trend + weekday pattern',
        upc: f.upc
      };
    });

  return (
    <div className="space-y-4 p-4">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <Lightbulb className="h-7 w-7 text-hanger-amber" aria-hidden />
          Suggestions
        </h2>
        <p className="text-muted-foreground">Forecast-driven reorder recommendations.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-hanger-amber" aria-hidden />
            Reorder recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {suggestions.length > 0 ? suggestions.map((item) => (
            <div key={item.upc} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{item.name}</p>
                <Badge variant="warning">{item.qty}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{item.reason}</p>
            </div>
          )) : (
            <p className="text-sm text-muted-foreground">No suggestions yet. Check back after some sales data.</p>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        Suggestions powered by live forecasts + inventory.
      </p>
    </div>
  );
}
