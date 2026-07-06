'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLocalEvents } from '@/features/events/api/use-local-events';
import { useInventoryList } from '@/lib/api';

interface LocalTrend {
  name: string;
  change: string;
  reason: string;
  upc?: string;
}

export default function TrendingSuggestions() {
  const [trends, setTrends] = useState<LocalTrend[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { data: eventsData } = useLocalEvents();
  const { data: inventory = [] } = useInventoryList();

  const getLocalSuggestions = async () => {
    setIsLoading(true);

    // Simulate AWS Lambda + Amazon Forecast call
    // In real: call backend /api/forecast or dedicated trending endpoint
    // using item metadata + time series from sales + local events multipliers
    await new Promise((r) => setTimeout(r, 650));

    // Mock realistic local trends for Hanger Liquor (Wiley/Denver area)
    // Uses current inventory + active events for "personalized" feel
    const activeEvents = eventsData?.localEvents ?? [];
    const hasRodeo = activeEvents.some((e) => /rodeo/i.test(e.name));
    const hasJuly = activeEvents.some((e) => /july|4th/i.test(e.name));

    const mockTrends: LocalTrend[] = [
      {
        name: 'High Noon Hard Seltzer 8pk',
        change: '+47%',
        reason: `Denver rodeo + summer spike${hasRodeo ? ' (active multiplier)' : ''}`,
        upc: '0123456789012', // demo
      },
      {
        name: 'Local Craft IPA 6pk',
        change: '+32%',
        reason: 'Denver summer + weekend events',
        upc: '071984000012',
      },
    ];

    if (hasJuly) {
      mockTrends.unshift({
        name: 'Bud Light 12pk',
        change: '+65%',
        reason: '4th of July boost active',
        upc: '018200000103',
      });
    }

    setTrends(mockTrends);
    setIsLoading(false);

    // Simple feedback (matches project demo style)
    alert(
      `📈 AWS Forecast (simulated Lambda):\n\n` +
        mockTrends
          .map((t) => `${t.name} ${t.change} — ${t.reason}`)
          .join('\n') +
        `\n\nSuggest adding to reorder list? (In real: would call backend to create event or add stock)`
    );
  };

  return (
    <Card className="bg-gradient-to-br from-amber-500/10 via-card to-violet-500/10 border-hanger-amber/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          🔥 Trending Locally — Hanger Liquor Store (Wiley / Denver area)
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Powered by Amazon Forecast + local events (rodeo, 4th of July, summer)
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {trends.length > 0 ? (
          trends.map((trend, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/80 p-3 text-sm"
            >
              <div>
                <p className="font-medium">{trend.name}</p>
                <p className="text-xs text-muted-foreground">{trend.reason}</p>
              </div>
              <div className="text-right">
                <span className="font-bold text-emerald-500">{trend.change}</span>
                <div className="text-[10px] text-muted-foreground">this period</div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-hanger-amber/30 p-4 text-center text-sm text-muted-foreground">
            No local trends yet. Tap below to simulate AWS Forecast run with current events + inventory.
          </div>
        )}

        <Button
          onClick={getLocalSuggestions}
          disabled={isLoading}
          className="w-full min-h-12 bg-amber-500 text-zinc-950 hover:bg-amber-400 active:scale-[0.985]"
        >
          {isLoading ? 'Running AWS Forecast…' : '🚀 Get Fresh Local AWS Suggestions'}
        </Button>

        <p className="text-center text-[10px] text-muted-foreground">
          Lambda + Forecast &lt; 1s in prod • Uses filtered OFF product data + your events
        </p>
      </CardContent>
    </Card>
  );
}
