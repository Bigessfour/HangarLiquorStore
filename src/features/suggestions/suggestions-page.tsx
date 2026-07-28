import { Lightbulb, TrendingUp, Plus, Calendar, PartyPopper } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useForecasts } from '@/features/forecast/api/use-forecasts';
import { useInventoryList, useAddInventoryItem } from '@/lib/api';
import { useCreateEvent, useLocalEvents } from '@/features/events/api/use-local-events';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { hasRole } from '@/lib/auth';
import { fetchProfitOps } from '@/lib/profit-api';
import { buildHolidayStockingSuggestions } from '@/lib/holiday-stocking';
import { Link } from 'react-router-dom';
import type { EventFocusTag } from '@/types/forecast';

export function SuggestionsPage() {
  const { data: forecasts = [] } = useForecasts(14);
  const { data: inventory = [] } = useInventoryList();
  const { data: eventsData } = useLocalEvents();
  const addInventory = useAddInventoryItem();
  const createEvent = useCreateEvent();
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const { data: profit } = useQuery({
    queryKey: ['profit', 'month', 'suggestions'],
    queryFn: () => fetchProfitOps('month'),
    enabled: hasRole('Manager'),
  });

  const cashByUpc = useMemo(() => {
    const map = new Map<
      string,
      { action: string; dollarsImpact: number; cashTiedUp?: number; daysOfCover?: number; reason: string }
    >();
    for (const r of profit?.optimization.recommendations ?? []) {
      if (r.upc === 'event') continue;
      map.set(r.upc, {
        action: r.action,
        dollarsImpact: r.dollarsImpact,
        cashTiedUp: r.cashTiedUp,
        daysOfCover: r.daysOfCover,
        reason: r.reason,
      });
    }
    return map;
  }, [profit]);

  const holidayStocking = useMemo(
    () =>
      buildHolidayStockingSuggestions({
        inventory,
        forecasts,
        staticHolidays: eventsData?.staticHolidays ?? [],
        localEvents: eventsData?.localEvents ?? [],
      }),
    [inventory, forecasts, eventsData],
  );

  const suggestions = forecasts
    .filter((f) => f.suggestedOrder > 0)
    .slice(0, 5)
    .map((f) => {
      const item = inventory.find((i) => i.upc === f.upc);
      const cash = cashByUpc.get(f.upc);
      const reasonParts: string[] = [];
      if (cash) {
        reasonParts.push(
          `${cash.action}: ~$${cash.dollarsImpact}${
            cash.cashTiedUp ? ` · $${cash.cashTiedUp} tied up` : ''
          }`,
        );
      } else if (f.confidence === 'high') {
        reasonParts.push('High confidence');
      }
      if (f.source === 'sagemaker') reasonParts.push('SageMaker ML');
      return {
        name: f.name,
        qty: `${f.suggestedOrder} units`,
        reason: reasonParts.length ? reasonParts.join(' · ') : 'Trend + weekday + holiday/event lift',
        upc: f.upc,
        suggestedOrder: f.suggestedOrder,
        dollarsImpact: cash?.dollarsImpact,
        action: cash?.action,
      };
    });

  const holdPromote = (profit?.optimization.recommendations ?? [])
    .filter((r) => r.upc !== 'event' && (r.action === 'hold' || r.action === 'promote'))
    .slice(0, 4);

  const handleAddToStock = (sug: { upc: string; name: string; suggestedOrder: number }) => {
    const invItem = inventory.find((i) => i.upc === sug.upc);
    addInventory.mutate(
      {
        upc: sug.upc,
        name: sug.name,
        quantity: sug.suggestedOrder,
        category: invItem?.category || 'Beer',
        packSize: invItem?.packSize || 1,
      } as never,
      {
        onSuccess: () => {
          setActionMessage(`Added ${sug.suggestedOrder} units of ${sug.name}`);
          setTimeout(() => setActionMessage(null), 2000);
        },
      },
    );
  };

  const handleCreateBoost = (
    holidayName?: string,
    multiplier = 1.5,
    focuses: EventFocusTag[] = ['Beer/RTD', 'Ice', 'Essentials'],
  ) => {
    createEvent.mutate(
      {
        name: holidayName || 'High Demand Boost',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        multiplier,
        notes: holidayName ? `Stocking boost for ${holidayName}` : 'From reorder suggestions',
        focuses,
      },
      {
        onSuccess: () => {
          setActionMessage(
            holidayName ? `Created local boost for ${holidayName}` : 'Created demand boost event',
          );
          setTimeout(() => setActionMessage(null), 2000);
        },
      },
    );
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold" data-tour="tour-suggestions">
          <Lightbulb className="h-7 w-7 text-hanger-amber" aria-hidden />
          Suggestions
        </h2>
        <p className="text-muted-foreground">
          Reorder, holiday stocking, and cash impact — forecasts + static holidays + your local events.
        </p>
      </div>

      {actionMessage && (
        <div className="rounded-md border border-green-500/30 bg-green-500/10 p-2 text-sm text-green-600">
          {actionMessage}
        </div>
      )}

      {holidayStocking.length > 0 && (
        <Card className="border-hanger-amber/30" data-testid="holiday-stocking">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PartyPopper className="h-5 w-5 text-hanger-amber" aria-hidden />
              Holiday stocking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Automatic lift for high-demand holidays (NYE, July 4, Thanksgiving, etc.). Add a local
              event for Hay Days, hunting, or rodeos — focuses bump matching categories.
            </p>
            {holidayStocking.map((h) => (
              <div key={`${h.holidayId}-${h.startDate}`} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {h.holidayName}{' '}
                      <span className="text-sm font-normal text-muted-foreground">
                        · in {h.daysUntil}d · ×{h.multiplier}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{h.stockingNote}</p>
                    {h.focuses.length > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Focus: {h.focuses.join(', ')}
                      </p>
                    )}
                  </div>
                  {hasRole('Manager') && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-10"
                      onClick={() => handleCreateBoost(h.holidayName, h.multiplier, h.focuses)}
                    >
                      <Calendar className="mr-1 h-3 w-3" /> Local boost
                    </Button>
                  )}
                </div>
                {h.suggestedSkus.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {h.suggestedSkus.map((sku) => (
                      <li
                        key={sku.upc}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <span className="truncate">{sku.name}</span>
                        <Badge variant="warning" className="shrink-0 bg-hanger-amber/20 text-hanger-amber">
                          +{sku.suggestedExtraUnits}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Coverage looks OK for focus categories — watch closer as the date nears.
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-hanger-amber/20 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-hanger-amber" aria-hidden />
            Reorder recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {suggestions.length > 0 ? (
            suggestions.map((item) => (
              <div
                key={item.upc}
                className="rounded-lg border border-border bg-card/50 p-3 transition-colors hover:bg-card"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.reason}</p>
                    {item.dollarsImpact != null && (
                      <p className="mt-1 text-xs font-medium text-hanger-amber">
                        Est. ${item.dollarsImpact} impact
                        {item.action ? ` (${item.action})` : ''}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="warning"
                    className="border-hanger-amber/30 bg-hanger-amber/20 text-hanger-amber"
                  >
                    {item.qty}
                  </Badge>
                </div>
                <div className="mt-3 flex gap-2">
                  {hasRole('Manager') && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-9 flex-1 text-xs"
                      onClick={() => handleAddToStock(item)}
                      disabled={addInventory.isPending}
                    >
                      <Plus className="mr-1 h-3 w-3" /> Add to Stock
                    </Button>
                  )}
                  {hasRole('Manager') && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-9 flex-1 text-xs"
                      onClick={() => handleCreateBoost()}
                    >
                      <Calendar className="mr-1 h-3 w-3" /> Boost Event
                    </Button>
                  )}
                  {!hasRole('Manager') && (
                    <span className="self-center text-xs text-muted-foreground">
                      Use Scan to adjust stock (Manager+ for shortcuts)
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No order suggestions yet. Check holidays above or wait for sales history.
            </p>
          )}
        </CardContent>
      </Card>

      {holdPromote.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hold / promote (cash)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {holdPromote.map((r) => (
              <div key={r.upc} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium capitalize">
                    {r.action}: {r.name}
                  </span>
                  <span className="tabular-nums text-hanger-amber">${r.dollarsImpact}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{r.reason}</p>
              </div>
            ))}
            <Button asChild variant="outline" className="min-h-11 w-full">
              <Link to="/profit">Full cash list on Profit &amp; Ops</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <p className="text-center text-sm text-muted-foreground">
        Dollar figures are estimates (category costs or Square shelf price when synced).
      </p>
    </div>
  );
}
