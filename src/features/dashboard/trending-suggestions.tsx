'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTrendingSuggestions } from '@/features/forecast/api/use-trending-suggestions';
import { useAddInventoryItem } from '@/lib/api';
import NewProductModal from '@/features/inventory/new-product-modal';
import type { TrendingSuggestion } from '@/types/forecast';

export default function TrendingSuggestions() {
  const { data: trends = [], isLoading, refetch, isFetching } = useTrendingSuggestions();
  const addInventory = useAddInventoryItem();
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // For "Customize" flow that opens NewProductModal prefilled (addresses user review intent safely)
  const [showCustomize, setShowCustomize] = useState(false);
  const [customizePrefill, setCustomizePrefill] = useState<{
    upc: string;
    name: string;
    packSize: number;
  } | null>(null);

  const loading = isLoading || isFetching;

  const handleAddSuggestion = (trend: TrendingSuggestion) => {
    addInventory.mutate(
      {
        upc: trend.upc,
        name: trend.name,
        quantity: trend.suggestedAdd,
        category: 'General',
        packSize: 1,
      } as any,
      {
        onSuccess: () => {
          const msg = `Added +${trend.suggestedAdd} × ${trend.name}`;
          setActionMessage(msg);
          setTimeout(() => setActionMessage(null), 2200);
        },
        onError: () => {
          setActionMessage('Add failed — try again');
          setTimeout(() => setActionMessage(null), 2000);
        },
      }
    );
  };

  const handleCustomize = (trend: TrendingSuggestion) => {
    setCustomizePrefill({
      upc: trend.upc,
      name: trend.name,
      packSize: 1, // suggestions don't carry pack; user can adjust in modal (realistic for hot new picks)
    });
    setShowCustomize(true);
  };

  const handleRefresh = () => {
    refetch();
  };

  return (
    <Card className="bg-gradient-to-br from-amber-500/10 via-card to-violet-500/10 border-hanger-amber/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          🔥 Trending Locally — Hanger Liquor Store (Wiley / Denver area)
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Powered by live Lambda forecast + local events (rodeo, 4th of July, summer)
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {actionMessage && (
          <div className="rounded-md bg-green-500/10 border border-green-500/30 px-3 py-1.5 text-xs text-green-600 font-medium">
            {actionMessage}
          </div>
        )}

        {trends.length > 0 ? (
          trends.map((trend) => (
            <div
              key={trend.upc}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/80 p-3 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-tight">{trend.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{trend.reason}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <div className="text-right">
                  <span className="font-bold text-emerald-500">{trend.change}</span>
                  <div className="text-[10px] text-muted-foreground">+{trend.suggestedAdd} suggested</div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 min-h-[44px] px-3 text-xs active:scale-[0.985]"
                    onClick={() => handleAddSuggestion(trend)}
                    disabled={addInventory.isPending}
                  >
                    + Add {trend.suggestedAdd}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9 min-h-[44px] px-2 text-[10px] text-muted-foreground active:scale-[0.985]"
                    onClick={() => handleCustomize(trend)}
                  >
                    Customize
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-hanger-amber/30 p-4 text-center text-sm text-muted-foreground">
            {loading ? 'Loading live trends…' : 'No trending items yet. Add local events for stronger multipliers.'}
          </div>
        )}

        <Button
          onClick={handleRefresh}
          disabled={loading}
          className="w-full min-h-12 bg-amber-500 text-zinc-950 hover:bg-amber-400 active:scale-[0.985]"
        >
          {loading ? 'Fetching from Lambda…' : trends.length > 0 ? '🔄 Refresh AWS Suggestions' : '🚀 Load Trending Suggestions'}
        </Button>

        <p className="text-center text-[10px] text-muted-foreground">
          Lightweight stats in Lambda • PAY_PER_REQUEST • Events drive boost
        </p>
      </CardContent>

      {/* NewProductModal integration for "Customize" flow from live suggestions (per Phase 7 polish) */}
      {customizePrefill && (
        <NewProductModal
          open={showCustomize}
          onClose={() => {
            setShowCustomize(false);
            setCustomizePrefill(null);
          }}
          scannedUPC={customizePrefill.upc}
          initialName={customizePrefill.name}
          initialPackSize={customizePrefill.packSize}
        />
      )}
    </Card>
  );
}
