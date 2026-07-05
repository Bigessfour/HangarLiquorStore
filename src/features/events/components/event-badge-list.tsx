import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LocalEvent, StaticHoliday } from '@/types/forecast';

interface EventBadgeListProps {
  localEvents: LocalEvent[];
  staticHolidays: StaticHoliday[];
}

export function EventBadgeList({ localEvents, staticHolidays }: EventBadgeListProps) {
  if (localEvents.length === 0 && staticHolidays.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Active Local Events & Holidays</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {staticHolidays.map((holiday) => (
          <Badge key={holiday.id} variant="secondary" className="text-sm py-1 px-3">
            {holiday.name} • ×{holiday.multiplier} (holiday)
          </Badge>
        ))}
        {localEvents.map((event) => (
          <Badge key={event.id} variant="default" className="text-sm py-1 px-3">
            {event.name} • ×{event.multiplier}
          </Badge>
        ))}
      </CardContent>
    </Card>
  );
}
