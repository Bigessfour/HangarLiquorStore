import { EventBadgeList } from '@/features/events/components/event-badge-list';
import { EventFormDialog } from '@/features/events/components/event-form-dialog';
import { useLocalEvents } from '@/features/events/api/use-local-events';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';

export function EventsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data, isLoading } = useLocalEvents();

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

      <p className="text-sm text-muted-foreground">
        July 4th boosts beer +40%. Wiley football season boosts spirits +25%.
      </p>

      <EventFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
