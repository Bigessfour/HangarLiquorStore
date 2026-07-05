import { Lightbulb, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const suggestions = [
  {
    name: 'Coors Light 12pk 12oz Cans',
    qty: '2 cases',
    reason: 'July 4th forecast +40% beer demand',
  },
  {
    name: "Jack Daniel's Tennessee Whiskey 750ml",
    qty: '1 case',
    reason: 'Below reorder point — football season ramp-up',
  },
  {
    name: 'Yellow Tail Cabernet Sauvignon 750ml',
    qty: '6 bottles',
    reason: 'Weekend wine spike from local festival',
  },
];

export function SuggestionsPage() {
  return (
    <div className="space-y-4 p-4">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <Lightbulb className="h-7 w-7 text-hanger-amber" aria-hidden />
          Suggestions
        </h2>
        <p className="text-muted-foreground">Reorder ideas based on forecasts and local events.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-hanger-amber" aria-hidden />
            Reorder recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {suggestions.map((item) => (
            <div key={item.name} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{item.name}</p>
                <Badge variant="warning">{item.qty}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{item.reason}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        Full forecast-driven suggestions arrive in Phase 2.
      </p>
    </div>
  );
}
