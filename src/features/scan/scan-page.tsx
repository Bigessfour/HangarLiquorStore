import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, CheckCircle2, ExternalLink, Keyboard, Loader2, ScanLine, XCircle } from 'lucide-react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useAddInventoryItem, useInventoryItem, fetchProduct } from '@/lib/api';
import { cn } from '@/lib/utils';
import { hasRole } from '@/lib/auth';

import { useOfflineQueueStore } from '@/stores/offline-queue-store';
import {
  INVENTORY_CATEGORIES,
  scanAddItemSchema,
  type InventoryCategory,
  type ScanAddItemInput,
} from '@/types/inventory';
import { lookupUpc } from '@/lib/upc-lookup';
import {
  canUseLiveCameraScan,
  getCameraDeniedMessage,
  getIosScanHelpUrl,
  isIosHomeScreenApp,
  prefersPhotoCaptureScan,
} from '@/lib/device-scan';
import NewProductModal from '@/features/inventory/new-product-modal';
import { toast } from 'sonner';
import {
  FILE_SCANNER_ELEMENT_ID,
  LIVE_SCANNER_ELEMENT_ID,
  PHOTO_CAPTURE_INPUT_ID,
  PHOTO_LIBRARY_INPUT_ID,
  normalizeUpc,
  scanBarcodeFromFile,
  startLiveBarcodeScanner,
} from '@/features/scan/lib/barcode-scan';

const SCANNER_ELEMENT_ID = LIVE_SCANNER_ELEMENT_ID;

function normalizeCategory(value?: string): InventoryCategory {
  if (!value) return 'Beer';
  const match = INVENTORY_CATEGORIES.find((c) => c.toLowerCase() === value.toLowerCase());
  return match ?? 'Beer';
}

function normalizeManualUpc(raw: string): string | null {
  return normalizeUpc(raw);
}

export function ScanPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isOnline = useOnlineStatus();
  const { queueAddItem } = useOfflineQueueStore();
  const addMutation = useAddInventoryItem();

  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scannedUpc, setScannedUpc] = useState<string | null>(null);
  const [manualUpc, setManualUpc] = useState('');
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [lookupResult, setLookupResult] = useState<null | { name: string; photo?: string; category?: string }>(null);
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [isPhotoScanning, setIsPhotoScanning] = useState(false);

  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const iosHomeScreen = isIosHomeScreenApp();

  const { data: matchedItem, isLoading: isLookingUp } = useInventoryItem(scannedUpc);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ScanAddItemInput>({
    resolver: zodResolver(scanAddItemSchema),
    defaultValues: { quantity: 1, category: 'Beer', packSize: 1, upc: '', name: '' },
  });

  const onInvalid = useCallback((fieldErrors: FieldErrors<ScanAddItemInput>) => {
    const first = Object.values(fieldErrors).find((e) => e?.message);
    const message = first?.message?.toString() || 'Check quantity, UPC, and product name.';
    setBanner({ type: 'error', message });
    toast.error(message);
  }, []);

  const stopScanner = useCallback(async () => {
    await scannerRef.current?.stop();
    scannerRef.current = null;
    setIsScanning(false);
  }, []);

  const applyUpc = useCallback(
    (upc: string) => {
      const normalized = normalizeManualUpc(upc);
      if (!normalized) return false;
      setScannedUpc(normalized);
      setValue('upc', normalized, { shouldValidate: true });
      setBanner({ type: 'success', message: `UPC ${normalized} ready` });
      return true;
    },
    [setValue],
  );

  const handleScanSuccess = useCallback(
    async (upc: string) => {
      await stopScanner();
      applyUpc(upc);
    },
    [applyUpc, stopScanner],
  );

  const handlePhotoScan = useCallback(
    async (file: File) => {
      setScanError(null);
      setIsPhotoScanning(true);
      try {
        const upc = await scanBarcodeFromFile(file, FILE_SCANNER_ELEMENT_ID);
        applyUpc(upc);
        setBanner({ type: 'success', message: `Barcode read from photo: ${upc}` });
      } catch (err) {
        setScanError(
          err instanceof Error
            ? err.message
            : 'Could not read barcode from photo. Try again or enter UPC manually.',
        );
      } finally {
        setIsPhotoScanning(false);
      }
    },
    [applyUpc],
  );

  const openSafariScanHelp = useCallback(async () => {
    const url = getIosScanHelpUrl();
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied — paste in Safari for live camera scan');
    } catch {
      toast.message(`Open in Safari: ${url}`);
    }
  }, []);

  const startScanner = useCallback(async () => {
    if (prefersPhotoCaptureScan()) {
      setScanError(null);
      return;
    }

    setScanError(null);
    setBanner(null);
    setScannedUpc(null);
    setManualUpc('');
    setLookupResult(null);
    setShowNewProductModal(false);
    reset({ quantity: 1, category: 'Beer', upc: '', name: '' });

    setIsScanning(true);
    try {
      scannerRef.current = await startLiveBarcodeScanner(
        (upc) => {
          void handleScanSuccess(upc);
        },
        (message) => {
          setScanError(message);
          setIsScanning(false);
        },
        SCANNER_ELEMENT_ID,
      );
    } catch (err) {
      setScanError(getCameraDeniedMessage(err));
      setIsScanning(false);
    }
  }, [handleScanSuccess, reset]);

  const handleManualUpc = () => {
    if (!applyUpc(manualUpc)) {
      setBanner({ type: 'error', message: 'Enter a valid 8–14 digit UPC' });
    }
  };

  useEffect(() => {
    if (matchedItem) {
      setValue('name', matchedItem.name);
      setValue('category', normalizeCategory(matchedItem.category));
      const pack = matchedItem.packSize ?? 1;
      setValue('packSize', pack);
      setValue('quantity', pack > 1 ? pack : 1);
      setBanner({
        type: 'success',
        message: `Found: ${matchedItem.name} (${matchedItem.currentStock} in stock)`,
      });
    }
  }, [matchedItem, setValue]);

  // Product catalog lookup (DDB / local JSON) + optional live Open Food Facts fallback.
  useEffect(() => {
    let cancelled = false;
    if (!scannedUpc || isLookingUp) return;

    const applyCatalogProduct = (backendProduct: {
      name?: string;
      product_name?: string;
      category?: InventoryCategory;
      packSize?: number;
      photo?: string;
      imageUrl?: string;
      image_url?: string;
    }) => {
      const name = backendProduct.name || backendProduct.product_name || '';
      const cat = backendProduct.category;
      const ps = backendProduct.packSize || 1;
      const photo = backendProduct.photo || backendProduct.imageUrl || backendProduct.image_url;
      if (name) {
        setLookupResult({ name, photo, category: cat });
        if (!matchedItem) {
          setValue('name', name);
          if (cat) setValue('category', normalizeCategory(cat));
          setValue('packSize', ps);
          setValue('quantity', ps);
        }
      } else if (photo && matchedItem) {
        setLookupResult({ name: matchedItem.name, photo, category: matchedItem.category });
      }
      const label = matchedItem ? 'In stock + catalog photo' : 'Found in product catalog';
      setBanner({ type: 'success', message: `${label}: ${name || matchedItem?.name}` });
    };

    if (matchedItem) {
      fetchProduct(scannedUpc).then((backendProduct) => {
        if (cancelled || !backendProduct) return;
        applyCatalogProduct(backendProduct);
      });
      return () => {
        cancelled = true;
      };
    }

    setLookupResult(null);
    fetchProduct(scannedUpc).then(async (backendProduct) => {
      if (cancelled) return;
      if (backendProduct) {
        applyCatalogProduct(backendProduct);
        return;
      }
      if (!isOnline) {
        setBanner({ type: 'success', message: 'New UPC (offline) — enter product name to add to inventory' });
        return;
      }
      const result = await lookupUpc(scannedUpc);
      if (cancelled || !result) {
        setBanner({ type: 'success', message: 'New UPC — enter product name to add to inventory (or check spelling)' });
        setShowNewProductModal(true);
        return;
      }
      setLookupResult({ name: result.name, photo: result.photo, category: result.category });
      setValue('name', result.name);
      if (result.category) setValue('category', normalizeCategory(result.category));
      if (result.packSize) {
        setValue('packSize', result.packSize);
        setValue('quantity', result.packSize);
      }
      setBanner({ type: 'success', message: `Looked up: ${result.name} (Open Food Facts)` });
    }).catch(() => {
      if (!cancelled) setBanner({ type: 'success', message: 'New UPC — enter product name to add to inventory' });
    });

    return () => {
      cancelled = true;
    };
  }, [scannedUpc, matchedItem, isLookingUp, isOnline, setValue]);

  useEffect(() => {
    const upcParam = searchParams.get('upc');
    if (!upcParam) return;
    applyUpc(upcParam);
    searchParams.delete('upc');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams, applyUpc]);

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, [stopScanner]);

  useEffect(() => {
    const releaseCamera = () => {
      if (document.visibilityState === 'hidden') {
        void stopScanner();
      }
    };
    document.addEventListener('visibilitychange', releaseCamera);
    window.addEventListener('pagehide', releaseCamera);
    return () => {
      document.removeEventListener('visibilitychange', releaseCamera);
      window.removeEventListener('pagehide', releaseCamera);
    };
  }, [stopScanner]);

  const onSubmit = async (values: ScanAddItemInput) => {
    setBanner(null);
    const payload: ScanAddItemInput = {
      ...values,
      packSize: values.packSize && values.packSize >= 1 ? values.packSize : 1,
      category: normalizeCategory(values.category),
    };
    try {
      if (!isOnline) {
        await queueAddItem(payload);
        const msg = `Offline — queued +${payload.quantity} for ${payload.name}`;
        setBanner({ type: 'success', message: msg });
        toast.success(msg);
      } else {
        await addMutation.mutateAsync(payload);
        const msg = `Added ${payload.quantity} × ${payload.name}`;
        setBanner({ type: 'success', message: msg });
        toast.success(msg);
      }
      setScannedUpc(null);
      setManualUpc('');
      setLookupResult(null);
      setShowNewProductModal(false);
      reset({ quantity: 1, category: 'Beer', packSize: 1, upc: '', name: '' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add item';
      setBanner({ type: 'error', message });
      toast.error(message);
    }
  };

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
      <div id={FILE_SCANNER_ELEMENT_ID} className="hidden" aria-hidden />
      <input
        id={PHOTO_CAPTURE_INPUT_ID}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-label="Take barcode photo with camera"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handlePhotoScan(file);
          e.target.value = '';
        }}
      />
      <input
        id={PHOTO_LIBRARY_INPUT_ID}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label="Choose barcode photo from library"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handlePhotoScan(file);
          e.target.value = '';
        }}
      />
      <div
        className={cn(
          'relative flex flex-1 flex-col',
          isScanning ? 'fixed inset-0 z-50 bg-black' : 'p-4',
        )}
      >
        {isScanning ? (
          <>
            <div id={SCANNER_ELEMENT_ID} className="h-full w-full" aria-label="Camera scanner" />
            <div className="absolute inset-x-0 bottom-0 space-y-3 bg-gradient-to-t from-black/90 to-transparent p-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">
              <p className="text-center text-sm text-white/90">Align UPC barcode in the frame</p>
              <Button
                type="button"
                variant="outline"
                className="min-h-12 w-full border-white/30 bg-black/50 text-white hover:bg-black/70"
                onClick={() => void stopScanner()}
              >
                Cancel scan
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 py-8">
            <div className="flex h-48 w-full max-w-sm items-center justify-center rounded-2xl border-2 border-dashed border-hanger-amber/40 bg-muted">
              <ScanLine className="h-20 w-20 text-muted-foreground" aria-hidden />
            </div>
            <p className="max-w-xs text-center text-muted-foreground">
              {iosHomeScreen
                ? 'iPhone Home Screen app: take a photo of the UPC barcode (recommended).'
                : 'Point your camera at a beer, spirits, wine, or mixer UPC barcode.'}
            </p>
            {iosHomeScreen && (
              <Alert className="max-w-sm border-hanger-amber/40 bg-hanger-amber/5" role="status">
                <AlertDescription className="text-sm">
                  <strong>iPhone tip:</strong> Live camera often fails in the installed app (Apple
                  limitation). Use <strong>Take Photo of Barcode</strong> below, or{' '}
                  <button
                    type="button"
                    className="font-semibold text-hanger-amber underline"
                    onClick={() => void openSafariScanHelp()}
                  >
                    open in Safari
                  </button>{' '}
                  for live scanning.
                </AlertDescription>
              </Alert>
            )}
            <p className="text-center text-[10px] text-muted-foreground max-w-xs">
              Catalog lookup fills name, category, and product photo automatically.
            </p>
            {!isOnline && (
              <p className="text-center text-sm text-hanger-amber" role="status">
                Offline — scans will queue until Wiley internet returns
              </p>
            )}
            {scanError && (
              <Alert className="max-w-sm border-destructive/30" role="alert">
                <XCircle className="h-5 w-5 text-destructive" />
                <AlertDescription>{scanError}</AlertDescription>
              </Alert>
            )}
            <label
              htmlFor={PHOTO_CAPTURE_INPUT_ID}
              className={cn(
                'inline-flex min-h-14 w-full max-w-sm cursor-pointer items-center justify-center rounded-lg px-4 text-lg font-bold touch-manipulation',
                iosHomeScreen
                  ? 'bg-gradient-to-r from-hanger-gold to-hanger-amber text-primary-foreground'
                  : 'border-2 border-hanger-amber/50 bg-card text-foreground hover:bg-muted',
                isPhotoScanning && 'pointer-events-none opacity-70',
              )}
            >
              {isPhotoScanning ? (
                <Loader2 className="mr-2 h-6 w-6 animate-spin" aria-hidden />
              ) : (
                <Camera className="mr-2 h-6 w-6" aria-hidden />
              )}
              {isPhotoScanning ? 'Reading barcode…' : 'Take Photo of Barcode'}
            </label>
            {iosHomeScreen && (
              <label
                htmlFor={PHOTO_LIBRARY_INPUT_ID}
                className={cn(
                  'inline-flex min-h-12 w-full max-w-sm cursor-pointer items-center justify-center rounded-lg border border-hanger-amber/40 px-4 text-sm font-medium text-hanger-amber touch-manipulation hover:bg-muted/50',
                  isPhotoScanning && 'pointer-events-none opacity-70',
                )}
              >
                Choose photo from library
              </label>
            )}
            {canUseLiveCameraScan() && (
              <Button
                type="button"
                size="lg"
                variant="outline"
                aria-label="Scan UPC barcode with live camera"
                className="min-h-14 w-full max-w-sm text-lg font-bold border-hanger-amber/50"
                onClick={() => void startScanner()}
              >
                <ScanLine className="mr-2 h-6 w-6" aria-hidden />
                Live Camera Scan
              </Button>
            )}
            {iosHomeScreen && (
              <Button
                type="button"
                variant="ghost"
                className="min-h-12 w-full max-w-sm text-sm text-hanger-amber"
                onClick={() => void openSafariScanHelp()}
              >
                <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
                Copy link — open in Safari for live scan
              </Button>
            )}
            <div className="flex w-full max-w-sm gap-2">
              <Input
                inputMode="numeric"
                placeholder="Or enter UPC manually"
                className="min-h-12"
                value={manualUpc}
                onChange={(e) => setManualUpc(e.target.value)}
                aria-label="Enter UPC manually"
              />
              <Button
                type="button"
                variant="outline"
                className="min-h-12 shrink-0"
                onClick={handleManualUpc}
                aria-label="Apply manual UPC"
              >
                <Keyboard className="h-5 w-5" aria-hidden />
              </Button>
            </div>
          </div>
        )}
      </div>

      {!isScanning && (scannedUpc || banner) && (
        <div className="space-y-4 border-t border-border bg-card p-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
          {banner && (
            <Alert
              className={cn(
                banner.type === 'success' ? 'border-green-500/30' : 'border-destructive/30',
              )}
              role="status"
              aria-live="polite"
            >
              {banner.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" aria-hidden />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" aria-hidden />
              )}
              <AlertDescription className="font-medium">{banner.message}</AlertDescription>
            </Alert>
          )}

          {lookupResult?.photo && (
            <div className="flex justify-center mb-3">
              <div className="text-center">
                <img 
                  src={lookupResult.photo} 
                  alt={lookupResult.name || 'Product'} 
                  className="w-24 h-24 rounded-xl object-cover border border-border shadow-sm mx-auto"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Photo from Hanger product catalog
                </p>
              </div>
            </div>
          )}
          {lookupResult && !lookupResult.photo && (
            <p className="text-center text-[10px] text-muted-foreground -mt-2 mb-2">
              Data from <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener" className="underline">Open Food Facts</a> (free open data)
            </p>
          )}

          {isLookingUp ? (
            <div className="space-y-2" aria-busy="true" aria-label="Looking up product">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4">
              <div>
                <Label htmlFor="scan-upc">UPC</Label>
                <Input
                  id="scan-upc"
                  inputMode="numeric"
                  aria-invalid={Boolean(errors.upc)}
                  {...register('upc')}
                />
                {errors.upc && (
                  <p className="mt-1 text-sm text-destructive" role="alert">
                    {errors.upc.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="scan-name">Name</Label>
                <Input
                  id="scan-name"
                  placeholder="e.g. Coors Light 12pk"
                  aria-invalid={Boolean(errors.name)}
                  {...register('name')}
                  disabled={!!matchedItem && !hasRole('Manager')}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-destructive" role="alert">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="scan-qty">Quantity (units) — all users can input via scan</Label>
                  <div className="flex gap-2">
                    <Input
                      id="scan-qty"
                      type="number"
                      min={1}
                      inputMode="numeric"
                      aria-invalid={Boolean(errors.quantity)}
                      {...register('quantity', { valueAsNumber: true })}
                    />
                    {matchedItem && (matchedItem as any).packSize > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-12 shrink-0"
                        onClick={() => setValue('quantity', (matchedItem as any).packSize)}
                        aria-label={`Set to full case of ${(matchedItem as any).packSize}`}
                      >
                        Case x{(matchedItem as any).packSize}
                      </Button>
                    )}
                  </div>
                  {errors.quantity && (
                    <p className="mt-1 text-sm text-destructive" role="alert">
                      {errors.quantity.message}
                    </p>
                  )}
                  {matchedItem && (matchedItem as any).packSize > 1 && (
                    <p className="mt-1 text-[10px] text-muted-foreground">Pack of {(matchedItem as any).packSize} • qty = units added</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="scan-category">Category</Label>
                  <select
                    id="scan-category"
                    className="flex h-12 w-full rounded-lg border border-input bg-background px-3 text-base"
                    {...register('category')}
                    disabled={!!matchedItem && !hasRole('Manager')}
                  >
                    {INVENTORY_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <input type="hidden" {...register('packSize')} />
              </div>
              <Button
                type="submit"
                className="min-h-14 w-full touch-manipulation text-base font-semibold"
                disabled={addMutation.isPending}
              >
                {addMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Adding…
                  </>
                ) : (
                  'Add to inventory'
                )}
              </Button>
            </form>
          )}
        </div>
      )}

      {/* New product quick add modal - triggered for unknown UPCs */}
      {scannedUpc && (
        <NewProductModal
          open={showNewProductModal}
          onClose={() => setShowNewProductModal(false)}
          scannedUPC={scannedUpc}
          initialName={lookupResult?.name}
          initialPackSize={(lookupResult as any)?.packSize || 1}
          initialPhoto={lookupResult?.photo}
        />
      )}
    </div>
  );
}
