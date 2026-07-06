import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ItemForecast } from '@/types/forecast';

interface ForecastItemTableProps {
  forecasts: ItemForecast[];
  onSelect: (item: ItemForecast) => void;
}

export function ForecastItemTable({ forecasts, onSelect }: ForecastItemTableProps) {
  const sorted = [...forecasts].sort((a, b) => b.suggestedOrder - a.suggestedOrder);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead className="text-right">Current</TableHead>
          <TableHead className="text-right">Predicted</TableHead>
          <TableHead className="text-right">Order</TableHead>
          <TableHead className="text-right">Source</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((item) => (
          <TableRow
            key={item.upc}
            className="cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() => onSelect(item)}
          >
            <TableCell className="font-medium">{item.name}</TableCell>
            <TableCell className="text-right">{item.currentStock}</TableCell>
            <TableCell className="text-right font-semibold">{item.predictedDemand14d}</TableCell>
            <TableCell className="text-right">
              <Badge variant={item.suggestedOrder > 30 ? 'destructive' : 'default'}>
                {item.suggestedOrder}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <Badge 
                variant="outline" 
                className={item.source === 'sagemaker' 
                  ? 'border-hanger-gold/60 text-hanger-gold bg-hanger-gold/5 text-[10px]' 
                  : 'text-[10px]'}
              >
                {item.source === 'sagemaker' ? 'SageMaker' : 'Statistical'}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
