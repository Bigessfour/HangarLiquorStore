import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateEvent } from '@/features/events/api/use-local-events';
import { hasRole } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { EVENT_FOCUS_TAGS, type EventFocusTag } from '@/types/forecast';

const eventSchema = z
  .object({
    name: z.string().min(3, 'Event name is required'),
    startDate: z.string().min(1, 'Start date required'),
    endDate: z.string().min(1, 'End date required'),
    multiplier: z.coerce.number().min(0.5).max(5),
    notes: z.string().optional(),
    focuses: z.array(z.enum(['Ice', 'Beer/RTD', 'Spirits', 'Essentials'])).optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

type EventForm = z.infer<typeof eventSchema>;

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefill when using “Wiley Hay Days” example or dashboard deep-link. */
  defaults?: Partial<EventForm>;
}

export function EventFormDialog({ open, onOpenChange, defaults }: EventFormDialogProps) {
  const createEvent = useCreateEvent();
  const canManage = hasRole('Manager');

  const form = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: '',
      startDate: '',
      endDate: '',
      multiplier: 1.5,
      focuses: [],
      notes: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: '',
      startDate: '',
      endDate: '',
      multiplier: 1.5,
      focuses: [],
      notes: '',
      ...defaults,
    });
  }, [open, defaults, form]);

  const selectedFocuses = form.watch('focuses') ?? [];

  const toggleFocus = (tag: EventFocusTag) => {
    const current = form.getValues('focuses') ?? [];
    const next = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    form.setValue('focuses', next, { shouldDirty: true });
  };

  const onSubmit = (data: EventForm) => {
    createEvent.mutate(
      {
        ...data,
        focuses: data.focuses?.length ? data.focuses : undefined,
      },
      {
        onSuccess: () => {
          form.reset({
            name: '',
            startDate: '',
            endDate: '',
            multiplier: 1.5,
            focuses: [],
            notes: '',
          });
          onOpenChange(false);
        },
      },
    );
  };

  if (!canManage) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Local Event Multiplier</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div>
            <Label htmlFor="name">Event Name</Label>
            <Input
              id="name"
              className="min-h-12"
              {...form.register('name')}
              placeholder="Wiley Harvest Festival"
            />
            {form.formState.errors.name && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                type="date"
                id="startDate"
                className="min-h-12"
                {...form.register('startDate')}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input type="date" id="endDate" className="min-h-12" {...form.register('endDate')} />
              {form.formState.errors.endDate && (
                <p className="mt-1 text-xs text-red-600">{form.formState.errors.endDate.message}</p>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="multiplier">Demand Multiplier</Label>
            <Input
              type="number"
              step="0.1"
              id="multiplier"
              className="min-h-12"
              {...form.register('multiplier')}
            />
            <p className="mt-1 text-xs text-slate-500">1.0 = normal • 2.5 = big boost</p>
          </div>
          <div>
            <Label>Planning focus</Label>
            <p className="mb-2 text-xs text-muted-foreground">
              Tag ice, beer, spirits, or essentials for Hay Days–style planning.
            </p>
            <div className="flex flex-wrap gap-2">
              {EVENT_FOCUS_TAGS.map((tag) => {
                const on = selectedFocuses.includes(tag);
                return (
                  <Button
                    key={tag}
                    type="button"
                    variant={on ? 'default' : 'outline'}
                    className={cn(
                      'min-h-12',
                      on && 'bg-hanger-amber text-primary-foreground hover:bg-hanger-amber/90',
                    )}
                    onClick={() => toggleFocus(tag)}
                    aria-pressed={on}
                  >
                    {tag}
                  </Button>
                );
              })}
            </div>
          </div>
          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              className="min-h-12"
              {...form.register('notes')}
              placeholder="Beer & ready-to-drink focus"
            />
          </div>
          <Button type="submit" className="w-full min-h-12" disabled={createEvent.isPending}>
            {createEvent.isPending ? 'Saving...' : 'Save Event & Update Forecasts'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
