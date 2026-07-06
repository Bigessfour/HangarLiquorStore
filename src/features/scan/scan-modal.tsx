import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Loader2, ScanLine, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { isIosHomeScreenApp } from '@/lib/device-scan';
import { toast } from 'sonner';
import {
  FILE_SCANNER_ELEMENT_ID,
  LIVE_SCANNER_ELEMENT_ID,
  PHOTO_CAPTURE_INPUT_ID,
  PHOTO_LIBRARY_INPUT_ID,
  scanBarcodeFromFile,
  startLiveBarcodeScanner,
} from './lib/barcode-scan';

type ScanModalProps = {
  onClose: () => void;
};

/** Quick-scan modal from the dashboard FAB — camera or photo, then hand off to /scan add form. */
export function ScanModal({ onClose }: ScanModalProps) {
  const navigate = useNavigate();
  const uid = useId().replace(/:/g, '');
  const liveElementId = `${LIVE_SCANNER_ELEMENT_ID}-${uid}`;
  const fileElementId = `${FILE_SCANNER_ELEMENT_ID}-${uid}`;
  const captureInputId = `${PHOTO_CAPTURE_INPUT_ID}-${uid}`;
  const libraryInputId = `${PHOTO_LIBRARY_INPUT_ID}-${uid}`;

  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [isPhotoScanning, setIsPhotoScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iosHomeScreen = isIosHomeScreenApp();

  const finishWithUpc = useCallback(
    (upc: string) => {
      toast.success(`UPC ${upc} scanned`);
      onClose();
      navigate(`/scan?upc=${encodeURIComponent(upc)}`);
    },
    [navigate, onClose],
  );

  const stopLive = useCallback(async () => {
    await scannerRef.current?.stop();
    scannerRef.current = null;
    setIsLive(false);
  }, []);

  const startLive = useCallback(async () => {
    setError(null);
    setIsLive(true);
    try {
      scannerRef.current = await startLiveBarcodeScanner(
        finishWithUpc,
        (message) => {
          setError(message);
          setIsLive(false);
        },
        liveElementId,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start camera');
      setIsLive(false);
    }
  }, [finishWithUpc, liveElementId]);

  const handlePhoto = useCallback(
    async (file: File) => {
      setError(null);
      setIsPhotoScanning(true);
      try {
        const upc = await scanBarcodeFromFile(file, fileElementId);
        finishWithUpc(upc);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Could not read barcode from photo. Try again or enter UPC manually.';
        setError(message);
        toast.error(message);
      } finally {
        setIsPhotoScanning(false);
      }
    },
    [fileElementId, finishWithUpc],
  );

  useEffect(() => {
    if (!iosHomeScreen) {
      void startLive();
    }
    return () => {
      void stopLive();
    };
    // Auto-start live camera once on open (not on iOS Home Screen PWA)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-black/95 text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Scan bottle barcode"
    >
      <div id={fileElementId} className="hidden" aria-hidden />

      <input
        id={captureInputId}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handlePhoto(file);
          e.target.value = '';
        }}
      />
      <input
        id={libraryInputId}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handlePhoto(file);
          e.target.value = '';
        }}
      />

      <div className="flex items-center justify-between px-4 pb-2 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <p className="text-lg font-semibold">Scan UPC</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-12 w-12 text-white hover:bg-white/10"
          aria-label="Close scanner"
          onClick={() => {
            void stopLive();
            onClose();
          }}
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      {isLive ? (
        <div className="relative flex flex-1 flex-col">
          <div id={liveElementId} className="min-h-0 flex-1" />
          <div className="space-y-3 bg-gradient-to-t from-black to-transparent p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <p className="text-center text-sm text-white/80">Align the UPC barcode in the frame</p>
            <Button
              type="button"
              variant="outline"
              className="min-h-12 w-full border-white/30 bg-black/50 text-white"
              onClick={() => void stopLive()}
            >
              Cancel live scan
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 pb-[calc(2rem+env(safe-area-inset-bottom))]">
          <ScanLine className="h-16 w-16 text-hanger-amber" aria-hidden />
          <p className="max-w-xs text-center text-sm text-white/80">
            {iosHomeScreen
              ? 'iPhone Home Screen app: use photo scan (camera permission is limited by Apple).'
              : 'Point at the barcode or use photo scan.'}
          </p>

          {error && (
            <Alert className="max-w-sm border-destructive/40 bg-destructive/10" role="alert">
              <AlertDescription className="text-sm text-white">{error}</AlertDescription>
            </Alert>
          )}

          <label
            htmlFor={captureInputId}
            className={cn(
              'inline-flex min-h-14 w-full max-w-sm cursor-pointer items-center justify-center rounded-lg bg-gradient-to-r from-hanger-gold to-hanger-amber px-4 text-lg font-bold text-primary-foreground touch-manipulation',
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

          <label
            htmlFor={libraryInputId}
            className={cn(
              'inline-flex min-h-12 w-full max-w-sm cursor-pointer items-center justify-center rounded-lg border border-hanger-amber/50 px-4 text-sm font-medium text-hanger-amber touch-manipulation',
              isPhotoScanning && 'pointer-events-none opacity-70',
            )}
          >
            Choose photo from library
          </label>

          {!iosHomeScreen && (
            <Button
              type="button"
              variant="outline"
              className="min-h-12 w-full max-w-sm border-hanger-amber/50"
              onClick={() => void startLive()}
            >
              <ScanLine className="mr-2 h-5 w-5" aria-hidden />
              Start live camera
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            className="text-sm text-white/70"
            onClick={() => {
              onClose();
              navigate('/scan');
            }}
          >
            Enter UPC manually instead
          </Button>
        </div>
      )}
    </div>
  );
}

export default ScanModal;