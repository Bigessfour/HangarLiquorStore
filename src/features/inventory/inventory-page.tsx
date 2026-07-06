import { useMemo, useState } from 'react';
import { CloudOff, Loader2, Package, Pencil, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useInventoryList } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  INVENTORY_CATEGORIES,
  type InventoryCategory,
  type InventoryItem,
} from '@/types/inventory';
import { ImportCSV } from '@/features/inventory/import-csv';
import { InventoryEditDialog } from '@/features/inventory/components/inventory-edit-dialog';
import { hasRole } from '@/lib/auth';

type CategoryFilter = InventoryCategory | 'All';

const CATEGORY_CHIPS: CategoryFilter[] = ['All', ...INVENTORY_CATEGORIES];

export function InventoryPage() {
  const isOnline = useOnlineStatus();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('All');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const queryParams = useMemo(
    () => ({ search: search.trim() || undefined, category }),
    [search, category],
  );

  const {
    data: items = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useInventoryList(queryParams);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Inventory</h2>
          <p className="text-sm text-muted-foreground">
            {items.length} item{items.length !== 1 ? 's' : ''}
            {isFetching && !isLoading && (
              <Loader2 className="ml-2 inline h-3 w-3 animate-spin" aria-hidden />
            )}
          </p>
        </div>
        {hasRole('Manager') && (
          <div className="flex gap-2">
            <ImportCSV 
              defaultIsShipment={true}
              trigger={
                <Button variant="outline" size="sm" className="min-h-9 text-xs bg-hanger-amber/10 border-hanger-amber/30">
                  Receive Shipment (Bulk)
                </Button>
              } 
            />
            <ImportCSV />
          </div>
        )}
      </div>

      {!isOnline && (
        <p
          className="flex items-center gap-2 rounded-lg border border-hanger-amber/30 bg-hanger-amber/10 px-3 py-2 text-sm text-hanger-amber"
          role="status"
        >
          <CloudOff className="h-4 w-4 shrink-0" aria-hidden />
          Offline — showing cached data. Changes sync when back online.
        </p>
      )}

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          placeholder="Search by name or UPC…"
          className="min-h-12 pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search inventory"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by category">
        {CATEGORY_CHIPS.map((chip) => (
          <Button
            key={chip}
            type="button"
            variant={category === chip ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'min-h-10 shrink-0 rounded-full px-4',
              category === chip &&
                'bg-hanger-amber text-primary-foreground hover:bg-hanger-amber/90',
            )}
            onClick={() => setCategory(chip)}
            aria-pressed={category === chip}
          >
            {chip}
          </Button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-2" aria-busy="true" aria-label="Loading inventory">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <Card className="border-destructive/30">
          <CardContent className="space-y-3 p-4">
            <p className="text-sm text-destructive" role="alert">
              {error?.message ?? 'Failed to load inventory'}
            </p>
            <Button
              type="button"
              variant="outline"
              className="min-h-12"
              onClick={() => void refetch()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground" aria-hidden />
          <p className="text-muted-foreground">No items match your search.</p>
          <ImportCSV
            trigger={
              <Button type="button" variant="outline" className="min-h-12">
                Import from CSV
              </Button>
            }
          />
        </div>
      )}

      {!isLoading && !isError && items.length > 0 && (
        <ul className="space-y-2" aria-label="Inventory items">
          {items.map((item) => {
            const isLow = item.reorderPoint !== undefined && item.currentStock <= item.reorderPoint;

            return (
              <li key={item.upc}>
                <Card className="transition-all hover:shadow-md border-hanger-amber/10">
                  <CardContent className="flex items-center gap-3 p-4">
                    {item.photo && (
                      <img
                        src={item.photo}
                        alt={item.name}
                        className="h-12 w-12 rounded object-cover border shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{item.category}</Badge>
                        <span className="font-mono text-xs text-muted-foreground">{item.upc}</span>
                        {item.packSize && item.packSize > 1 && (
                          <Badge variant="outline" className="text-[10px]">pack of {item.packSize}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p
                          className={cn(
                            'text-2xl font-bold tabular-nums',
                            isLow && 'text-destructive',
                          )}
                        >
                          {item.currentStock}
                        </p>
                        <p className="text-xs text-muted-foreground">in stock</p>
                        {isLow && (
                          <p className="text-[10px] text-destructive font-medium">LOW / Shrink risk</p>
                        )}
                      </div>
                      {hasRole('Manager') && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="min-h-12 min-w-12 shrink-0"
                          aria-label={`Edit ${item.name}`}
                          onClick={() => setEditingItem(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <InventoryEditDialog
        item={editingItem}
        open={Boolean(editingItem)}
        onOpenChange={(open) => {
          if (!open) setEditingItem(null);
        }}
      />
    </div>
  );
}
