import { EventBadgeList } from '@/features/events/components/event-badge-list';
import { EventFormDialog } from '@/features/events/components/event-form-dialog';
import { useLocalEvents, useCreateEvent } from '@/features/events/api/use-local-events';
import { hasRole } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';

export function EventsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data, isLoading } = useLocalEvents();
  const createEvent = useCreateEvent();

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
        <h2 className="text-2xl font-bold">Local Events</h2>
        <Button onClick={() => setDialogOpen(true)}>Add Event</Button>
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
              onClick={() => quickToggle('4th of July Boost', 1.35, 'Beer focus')}
              className="w-full py-4 bg-violet-600 text-lg active:scale-[0.985]"
            >
              🎉 Enable 4th of July +35% (Beer)
            </Button>
            <Button
              onClick={() => quickToggle('Denver Rodeo Weekend', 1.2, 'Whiskey boost')}
              className="w-full py-4 bg-orange-600 text-lg active:scale-[0.985]"
            >
              🐎 Rodeo Weekend +20% (Spirits)
            </Button>
          </>
        ) : (
          <p className="text-xs text-center text-muted-foreground">Manager or Owner can enable multipliers</p>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        July 4th boosts beer +40%. Wiley football season boosts spirits +25%.
      </p>

      <EventFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
