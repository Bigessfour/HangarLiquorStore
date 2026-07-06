'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { forecastApi } from '@/features/forecast/api/forecast-api';
import type { TrendingSuggestion } from '@/types/forecast';

export default function TrendingSuggestions() {
  const [trends, setTrends] = useState<TrendingSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const getLocalSuggestions = async () => {
    setIsLoading(true);
    try {
      const data = await forecastApi.getTrending();
      setTrends(data);
      if (data.length > 0) {
        alert(
          `📈 AWS Forecast (Lambda):\n\n` +
            data
              .map((t) => `${t.name} ${t.change} — ${t.reason} (add ~${t.suggestedAdd})`)
              .join('\n') +
            `\n\nLive data from inventory + events. Low-cost in-Lambda stats (no extra ML services).`
        );
      } else {
        alert('No strong trends right now. Add a local event (rodeo, holiday) to boost suggestions.');
      }
    } catch (e) {
      alert('Failed to load trending. Check connection or try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
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
                <div className="text-[10px] text-muted-foreground">+{trend.suggestedAdd} suggested</div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-hanger-amber/30 p-4 text-center text-sm text-muted-foreground">
            No local trends loaded. Tap below for live AWS Lambda suggestions (inventory + events).
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
          Lightweight stats in Lambda • PAY_PER_REQUEST DynamoDB • Filtered OFF catalog
        </p>
      </CardContent>
    </Card>
  );
}
