import { Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const items = [
  { name: 'Coors Light 12pk 12oz Cans', stock: 48, category: 'beer' },
  { name: "Jack Daniel's Tennessee Whiskey 750ml", stock: 3, category: 'whiskey', low: true },
  { name: "Tito's Handmade Vodka 1L", stock: 22, category: 'spirits' },
  { name: 'Bud Light 12pk 12oz Cans', stock: 5, category: 'beer', low: true },
];

export function InventoryPage() {
  return (
    <div className="space-y-4 p-4">
      <h2 className="text-2xl font-bold">Inventory</h2>
      <div className="space-y-2">
        {items.map((item) => (
          <Card key={item.name}>
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{item.name}</p>
                <Badge variant="secondary" className="mt-1 capitalize">
                  {item.category}
                </Badge>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold ${item.low ? 'text-destructive' : ''}`}>
                  {item.stock}
                </p>
                <p className="text-xs text-muted-foreground">in stock</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Package className="h-4 w-4" />
        Tap Scan Bottle to update stock instantly.
      </p>
    </div>
  );
}