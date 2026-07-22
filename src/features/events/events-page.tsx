import { EventBadgeList } from '@/features/events/components/event-badge-list';
import { EventFormDialog } from '@/features/events/components/event-form-dialog';
import { useLocalEvents, useCreateEvent } from '@/features/events/api/use-local-events';
import { hasRole } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import type { EventFocusTag } from '@/types/forecast';

const HAY_DAYS_DEFAULTS = {
  name: 'Wiley Hay Days',
  startDate: '2027-06-18',
  endDate: '2027-06-20',
  multiplier: 1.4,
  notes: 'Beer, ice, and store essentials for festival weekend',
  focuses: ['Ice', 'Beer/RTD', 'Essentials'] as EventFocusTag[],
};

export function EventsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formDefaults, setFormDefaults] = useState<Partial<typeof HAY_DAYS_DEFAULTS> | undefined>();
  const { data, isLoading } = useLocalEvents();
  const createEvent = useCreateEvent();

  const openAdd = (defaults?: Partial<typeof HAY_DAYS_DEFAULTS>) => {
    setFormDefaults(defaults);
    setDialogOpen(true);
  };

  const quickToggle = (name: string, multiplier: number, notes: string) => {
    createEvent.mutate({
      name,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      multiplier,
      notes,
    });
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold" data-tour="tour-events">
          Local Events
        </h2>
        {hasRole('Manager') ? (
          <Button className="min-h-12" onClick={() => openAdd()}>
            Add Event
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">View only</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Multipliers</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <EventBadgeList
              localEvents={data?.localEvents ?? []}
              staticHolidays={data?.staticHolidays ?? []}
            />
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        {hasRole('Manager') ? (
          <>
            <Button
              type="button"
              onClick={() => openAdd(HAY_DAYS_DEFAULTS)}
              className="w-full min-h-12 py-4 bg-hanger-amber text-primary-foreground text-lg active:scale-[0.985]"
              data-testid="add-hay-days-example"
            >
              Add Wiley Hay Days (Jun 18–20, 2027)
            </Button>
            <Button
              onClick={() => quickToggle('4th of July Boost', 1.35, 'Beer focus')}
              className="w-full py-4 bg-violet-600 text-lg active:scale-[0.985]"
            >
              Enable 4th of July +35% (Beer)
            </Button>
            <Button
              onClick={() => quickToggle('Denver Rodeo Weekend', 1.2, 'Whiskey boost')}
              className="w-full py-4 bg-orange-600 text-lg active:scale-[0.985]"
            >
              Rodeo Weekend +20% (Spirits)
            </Button>
          </>
        ) : (
          <p className="text-xs text-center text-muted-foreground">
            Manager or Owner can enable multipliers
          </p>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Local festivals (like Hay Days) and holidays bump demand for beer, ice, and essentials —
        forecasts pick up the multiplier automatically.
      </p>

      <EventFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setFormDefaults(undefined);
        }}
        defaults={formDefaults}
      />
    </div>
  );
}
