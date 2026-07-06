import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateInventoryItem } from '@/lib/api';
import { INVENTORY_CATEGORIES, inventoryItemSchema, type InventoryItem } from '@/types/inventory';
import { z } from 'zod';

const editFormSchema = inventoryItemSchema.pick({
  upc: true,
  name: true,
  category: true,
  currentStock: true,
  reorderPoint: true,
  packSize: true,
});

type EditFormValues = z.infer<typeof editFormSchema>;

interface InventoryEditDialogProps {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InventoryEditDialog({ item, open, onOpenChange }: InventoryEditDialogProps) {
  const updateMutation = useUpdateInventoryItem({
    onSuccess: () => onOpenChange(false),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editFormSchema),
  });

  useEffect(() => {
    if (item) {
      reset({
        upc: item.upc,
        name: item.name,
        category: item.category,
        currentStock: item.currentStock,
        reorderPoint: item.reorderPoint ?? 0,
        packSize: (item as any).packSize ?? 1,
      });
    }
  }, [item, reset]);

  const onSubmit = (values: EditFormValues) => {
    updateMutation.mutate({
      upc: values.upc,
      name: values.name,
      category: values.category,
      currentStock: values.currentStock,
      reorderPoint: values.reorderPoint,
      packSize: values.packSize,
    } as any);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="edit-upc">UPC</Label>
            <Input id="edit-upc" readOnly className="bg-muted" {...register('upc')} />
          </div>
          <div>
            <Label htmlFor="edit-name">Name</Label>
            <Input id="edit-name" aria-invalid={Boolean(errors.name)} {...register('name')} />
            {errors.name && (
              <p className="mt-1 text-sm text-destructive" role="alert">
                {errors.name.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="edit-category">Category</Label>
            <select
              id="edit-category"
              className="flex h-12 w-full rounded-lg border border-input bg-background px-3 text-base"
              {...register('category')}
            >
              {INVENTORY_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="edit-stock">Current stock</Label>
              <Input
                id="edit-stock"
                type="number"
                min={0}
                inputMode="numeric"
                aria-invalid={Boolean(errors.currentStock)}
                {...register('currentStock', { valueAsNumber: true })}
              />
              {errors.currentStock && (
                <p className="mt-1 text-sm text-destructive" role="alert">
                  {errors.currentStock.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-reorder">Reorder point</Label>
              <Input
                id="edit-reorder"
                type="number"
                min={0}
                inputMode="numeric"
                {...register('reorderPoint', { valueAsNumber: true })}
              />
            </div>
            <div>
              <Label htmlFor="edit-pack">Pack size (case-break)</Label>
              <Input
                id="edit-pack"
                type="number"
                min={1}
                inputMode="numeric"
                {...register('packSize', { valueAsNumber: true })}
              />
            </div>
          </div>
          <Button
            type="submit"
            className="min-h-12 w-full bg-gradient-to-r from-hanger-gold to-hanger-amber"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              'Save changes'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
