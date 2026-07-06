import { Card, CardContent } from '@/components/ui/card';

interface ForecastSummaryCardsProps {
  totalItems: number;
  reorderCount: number;
}

export function ForecastSummaryCards({ totalItems, reorderCount }: ForecastSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-4xl font-semibold">{totalItems}</div>
          <div className="text-sm text-slate-500">Items with active forecasts</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-4xl font-semibold text-amber-600">{reorderCount}</div>
          <div className="text-sm text-slate-500">Need reorder attention</div>
        </CardContent>
      </Card>
    </div>
  );
}
