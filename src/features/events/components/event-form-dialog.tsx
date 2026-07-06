import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateEvent } from '@/features/events/api/use-local-events';

const eventSchema = z.object({
  name: z.string().min(3, 'Event name is required'),
  startDate: z.string().min(1, 'Start date required'),
  endDate: z.string().min(1, 'End date required'),
  multiplier: z.coerce.number().min(0.5).max(5),
  notes: z.string().optional(),
});

type EventForm = z.infer<typeof eventSchema>;

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EventFormDialog({ open, onOpenChange }: EventFormDialogProps) {
  const createEvent = useCreateEvent();

  const form = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      multiplier: 1.5,
    },
  });

  const onSubmit = (data: EventForm) => {
    createEvent.mutate(data, {
      onSuccess: () => {
        form.reset({ multiplier: 1.5 });
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Local Event Multiplier</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div>
            <Label htmlFor="name">Event Name</Label>
            <Input id="name" {...form.register('name')} placeholder="Wiley Harvest Festival" />
            {form.formState.errors.name && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input type="date" id="startDate" {...form.register('startDate')} />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input type="date" id="endDate" {...form.register('endDate')} />
            </div>
          </div>
          <div>
            <Label htmlFor="multiplier">Demand Multiplier</Label>
            <Input type="number" step="0.1" id="multiplier" {...form.register('multiplier')} />
            <p className="mt-1 text-xs text-slate-500">1.0 = normal • 2.5 = big boost</p>
          </div>
          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              {...form.register('notes')}
              placeholder="Beer & ready-to-drink focus"
            />
          </div>
          <Button type="submit" className="w-full h-12" disabled={createEvent.isPending}>
            {createEvent.isPending ? 'Saving...' : 'Save Event & Update Forecasts'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
