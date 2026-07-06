'use client';

import { useRef, useState } from 'react';
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
  initialPhoto?: string;
}

export default function NewProductModal({
  open,
  onClose,
  scannedUPC,
  initialName = '',
  initialPackSize = 1,
  initialPhoto,
}: NewProductModalProps) {
  const [name, setName] = useState(initialName || 'New Item - Tap to edit');
  const [packSize, setPackSize] = useState(initialPackSize);
  const [category, setCategory] = useState<InventoryCategory>('Beer');
  const [initialStock, setInitialStock] = useState(0);
  const [photo, setPhoto] = useState<string | null>(initialPhoto || null);

  // Camera capture state/refs (browser getUserMedia, mobile friendly)
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const addMutation = useAddInventoryItem();

  async function startCamera() {
    try {
      setIsCapturing(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (e) {
      alert('Camera access failed. Check permissions or use device camera app.');
      setIsCapturing(false);
      stopCamera();
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCapturing(false);
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
    setPhoto(dataUrl);
    stopCamera();
  }

  function removePhoto() {
    setPhoto(null);
  }

  const handleAdd = async () => {
    if (!name.trim()) return;

    try {
      await addMutation.mutateAsync({
        upc: scannedUPC,
        name: name.trim(),
        quantity: initialStock,
        category,
        packSize,
        photo: photo || undefined,
      });

      // Simple success feedback (project uses alerts/banners for demo)
      alert(`🌟 New item added to Hanger Liquor Store\n${name} (${packSize}pk)\nStock = ${initialStock} (ready to receive)`);

      handleClose();
      // Reset for next
      setName('');
      setPackSize(1);
      setCategory('Beer');
      setInitialStock(0);
      setPhoto(null);
    } catch (err) {
      alert('Failed to add item. Try again.');
    }
  };

  // Ensure camera is stopped when dialog closes
  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
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

          {/* Camera photo capture (Phase 7: direct in new product flow) */}
          <div>
            <Label>Photo (optional)</Label>
            {photo ? (
              <div className="space-y-2">
                <img src={photo} alt="Captured product" className="max-h-32 rounded border object-contain" />
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={removePhoto} className="min-h-10">
                    Remove Photo
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={startCamera} className="min-h-10">
                    Retake
                  </Button>
                </div>
              </div>
            ) : isCapturing ? (
              <div className="space-y-2">
                <video ref={videoRef} className="w-full max-h-48 rounded bg-black" playsInline muted />
                <canvas ref={canvasRef} className="hidden" />
                <div className="flex gap-2">
                  <Button type="button" onClick={capturePhoto} className="min-h-10 flex-1">
                    📸 Capture Photo
                  </Button>
                  <Button type="button" variant="outline" onClick={stopCamera} className="min-h-10">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={startCamera}
                className="w-full min-h-12"
              >
                📷 Capture Photo with Camera
              </Button>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Use device camera for product image (shows in scan &amp; trending).
            </p>
          </div>
        </div>

        <Button
          onClick={handleAdd}
          disabled={addMutation.isPending || !name.trim()}
          className="w-full py-6 bg-gradient-to-r from-emerald-600 to-hanger-gold hover:from-emerald-500 text-lg shadow-sm"
        >
          {addMutation.isPending ? 'Adding...' : 'Add to Hanger Inventory + Notify Forecast'}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Photo captured here will show during scans and in trending suggestions.
        </p>
      </DialogContent>
    </Dialog>
  );
}
