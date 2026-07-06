'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAddInventoryItem } from '@/lib/api';
import { INVENTORY_CATEGORIES, type InventoryCategory } from '@/types/inventory';

interface NewProductModalProps {
  open: boolean;
  onClose: () => void;
  scannedUPC: string;
  initialName?: string;
  initialPackSize?: number;
}

export default function NewProductModal({
  open,
  onClose,
  scannedUPC,
  initialName = '',
  initialPackSize = 1,
}: NewProductModalProps) {
  const [name, setName] = useState(initialName || 'New Item - Tap to edit');
  const [packSize, setPackSize] = useState(initialPackSize);
  const [category, setCategory] = useState<InventoryCategory>('Beer');
  const [initialStock, setInitialStock] = useState(0);

  const addMutation = useAddInventoryItem();

  const handleAdd = async () => {
    if (!name.trim()) return;

    try {
      await addMutation.mutateAsync({
        upc: scannedUPC,
        name: name.trim(),
        quantity: initialStock,
        category,
        packSize,
      });

      // Simple success feedback (project uses alerts/banners for demo)
      alert(`🌟 New item added to Hanger Liquor Store\n${name} (${packSize}pk)\nStock = ${initialStock} (ready to receive)`);

      onClose();
      // Reset for next
      setName('');
      setPackSize(1);
      setCategory('Beer');
      setInitialStock(0);
    } catch (err) {
      alert('Failed to add item. Try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-hanger-amber text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🆕 New Product Detected
          </DialogTitle>
          <p className="text-sm text-muted-foreground">UPC: {scannedUPC}</p>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="new-name">Product Name</Label>
            <Input
              id="new-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. High Noon Hard Seltzer 8pk"
              className="min-h-12"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="new-pack">Pack Size</Label>
              <select
                id="new-pack"
                className="flex h-12 w-full rounded-lg border border-input bg-background px-3 text-base"
                value={packSize}
                onChange={(e) => setPackSize(Number(e.target.value))}
              >
                <option value="1">Single bottle</option>
                <option value="6">6pk</option>
                <option value="8">8pk (common for seltzer)</option>
                <option value="12">12pk case</option>
              </select>
            </div>

            <div>
              <Label htmlFor="new-category">Category</Label>
              <select
                id="new-category"
                className="flex h-12 w-full rounded-lg border border-input bg-background px-3 text-base"
                value={category}
                onChange={(e) => setCategory(e.target.value as InventoryCategory)}
              >
                {INVENTORY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="new-stock">Initial Stock (units)</Label>
            <Input
              id="new-stock"
              type="number"
              min={0}
              value={initialStock}
              onChange={(e) => setInitialStock(Number(e.target.value))}
              className="min-h-12"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Set to 0 if receiving later. Will be adjusted on receipt.
            </p>
          </div>
        </div>

        <Button
          onClick={handleAdd}
          disabled={addMutation.isPending || !name.trim()}
          className="w-full py-6 bg-emerald-600 hover:bg-emerald-500 text-lg"
        >
          {addMutation.isPending ? 'Adding...' : 'Add to Hanger Inventory + Notify Forecast'}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Photo can be captured later via camera in inventory edit. Will appear in local trending suggestions.
        </p>
      </DialogContent>
    </Dialog>
  );
}
