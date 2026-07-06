import { Lightbulb, TrendingUp, Plus, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useForecasts } from '@/features/forecast/api/use-forecasts';
import { useInventoryList, useAddInventoryItem } from '@/lib/api';
import { useCreateEvent } from '@/features/events/api/use-local-events';
import { useState } from 'react';

export function SuggestionsPage() {
  const { data: forecasts = [] } = useForecasts(14);
  const { data: inventory = [] } = useInventoryList();
  const addInventory = useAddInventoryItem();
  const createEvent = useCreateEvent();
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const suggestions = forecasts
    .filter((f) => f.suggestedOrder > 0)
    .slice(0, 5)
    .map((f) => {
      const item = inventory.find((i) => i.upc === f.upc);
      const reasonParts: string[] = [];
      if (f.confidence === 'high') reasonParts.push('High confidence');
      if (f.source === 'sagemaker') reasonParts.push('SageMaker ML');
      return {
        name: f.name,
        qty: `${f.suggestedOrder} units`,
        reason: reasonParts.length ? reasonParts.join(' + ') : 'Trend + weekday pattern',
        upc: f.upc,
        suggestedOrder: f.suggestedOrder,
      };
    });

  const handleAddToStock = (sug: any) => {
    const invItem = inventory.find((i) => i.upc === sug.upc);
    addInventory.mutate(
      {
        upc: sug.upc,
        name: sug.name,
        quantity: sug.suggestedOrder,
        category: invItem?.category || 'Beer',
        packSize: invItem?.packSize || 1,
      } as any,
      {
        onSuccess: () => {
          setActionMessage(`Added ${sug.suggestedOrder} units of ${sug.name}`);
          setTimeout(() => setActionMessage(null), 2000);
        },
      }
    );
  };

  const handleCreateBoost = () => {
    createEvent.mutate(
      {
        name: 'High Demand Boost',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        multiplier: 1.5,
        notes: 'From reorder suggestions',
      },
      {
        onSuccess: () => {
          setActionMessage('Created demand boost event from suggestions');
          setTimeout(() => setActionMessage(null), 2000);
        },
      }
    );
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <Lightbulb className="h-7 w-7 text-hanger-amber" aria-hidden />
          Suggestions
        </h2>
        <p className="text-muted-foreground">Forecast-driven reorder recommendations. Premium ML + statistical.</p>
      </div>

      {actionMessage && (
        <div className="rounded-md bg-green-500/10 border border-green-500/30 p-2 text-sm text-green-600">
          {actionMessage}
        </div>
      )}

      <Card className="border-hanger-amber/20 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-hanger-amber" aria-hidden />
            Reorder recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {suggestions.length > 0 ? suggestions.map((item) => (
            <div key={item.upc} className="rounded-lg border border-border p-3 bg-card/50 hover:bg-card transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.reason}</p>
                </div>
                <Badge variant="warning" className="bg-hanger-amber/20 text-hanger-amber border-hanger-amber/30">{item.qty}</Badge>
              </div>
              <div className="mt-3 flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1 min-h-9 text-xs"
                  onClick={() => handleAddToStock(item)}
                  disabled={addInventory.isPending}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add to Stock
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1 min-h-9 text-xs"
                  onClick={handleCreateBoost}
                >
                  <Calendar className="h-3 w-3 mr-1" /> Boost Event
                </Button>
              </div>
            </div>
          )) : (
            <p className="text-sm text-muted-foreground">No suggestions yet. Check back after some sales data or enable SageMaker Canvas.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-hanger-gold/20 bg-gradient-to-br from-hanger-gold/5 to-transparent">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Premium Features:</strong> Live forecasts from AWS SageMaker Canvas (high-accuracy ML) + statistical engine. 
            Integrated with events for multipliers. Bulk actions available.
          </p>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        Suggestions powered by live forecasts + inventory. Developed with AWS best practices.
      </p>
    </div>
  );
}
