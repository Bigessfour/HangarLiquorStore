import { Camera, Loader2, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  LIVE_SCANNER_ELEMENT_ID,
  PHOTO_CAPTURE_INPUT_ID,
  PHOTO_LIBRARY_INPUT_ID,
} from '@/features/scan/lib/barcode-scan';

type BarcodeCaptureZoneProps = {
  /** iOS Home Screen PWA — photo capture only (no inline live feed). */
  photoOnly: boolean;
  isLiveScanning: boolean;
  isPhotoScanning: boolean;
  capturePreviewUrl?: string | null;
  scannerElementId?: string;
  captureInputId?: string;
  libraryInputId?: string;
  onStartLiveScan?: () => void;
  onStopLiveScan?: () => void;
  /** Dark overlay (scan modal) — light text on dark background. */
  dark?: boolean;
  className?: string;
};

/**
 * Primary scan viewport: live camera inline on supported devices,
 * or a large tap-to-camera zone for iOS Home Screen PWAs.
 */
export function BarcodeCaptureZone({
  photoOnly,
  isLiveScanning,
  isPhotoScanning,
  capturePreviewUrl,
  scannerElementId = LIVE_SCANNER_ELEMENT_ID,
  captureInputId = PHOTO_CAPTURE_INPUT_ID,
  libraryInputId = PHOTO_LIBRARY_INPUT_ID,
  onStartLiveScan,
  onStopLiveScan,
  dark = false,
  className,
}: BarcodeCaptureZoneProps) {
  const zoneClass = cn(
    'relative flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border-2 border-dashed border-hanger-amber/50 bg-muted',
    'min-h-[min(42vh,280px)] touch-manipulation',
    className,
  );

  if (isLiveScanning) {
    return (
      <div className={cn(zoneClass, 'border-solid border-hanger-amber bg-black')}>
        <div id={scannerElementId} className="min-h-[min(42vh,280px)] w-full flex-1" aria-label="Camera scanner" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3">
          <p className="mb-2 text-center text-xs text-white/90">Align UPC barcode in the frame</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 w-full border-white/30 bg-black/50 text-white hover:bg-black/70"
            onClick={() => void onStopLiveScan?.()}
          >
            Cancel live scan
          </Button>
        </div>
      </div>
    );
  }

  if (photoOnly) {
    return (
      <label
        htmlFor={captureInputId}
        className={cn(
          zoneClass,
          'cursor-pointer items-center justify-center gap-3 p-6 text-center transition-colors active:bg-muted/80',
          isPhotoScanning && 'pointer-events-none opacity-80',
        )}
        aria-label="Tap to open camera and photograph barcode"
      >
        {capturePreviewUrl ? (
          <img
            src={capturePreviewUrl}
            alt="Barcode photo preview"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <div
          className={cn(
            'relative z-10 flex flex-col items-center gap-2',
            capturePreviewUrl && 'rounded-lg bg-black/50 px-4 py-3 text-white',
          )}
        >
          {isPhotoScanning ? (
            <>
              <Loader2 className="h-14 w-14 animate-spin text-hanger-amber" aria-hidden />
              <span className="text-base font-semibold">Reading barcode…</span>
            </>
          ) : (
            <>
              <Camera className="h-14 w-14 text-hanger-amber" aria-hidden />
              <span className={cn('text-lg font-bold', dark ? 'text-white' : 'text-foreground')}>
                Tap to open camera
              </span>
              <span
                className={cn(
                  'max-w-[220px] text-sm',
                  dark ? 'text-white/70' : 'text-muted-foreground',
                )}
              >
                Photograph the UPC barcode on the bottle label
              </span>
            </>
          )}
        </div>
      </label>
    );
  }

  return (
    <div className={cn(zoneClass, 'items-center justify-center gap-3 p-6 text-center')}>
      <ScanLine className="h-14 w-14 text-muted-foreground" aria-hidden />
      <p className="max-w-[240px] text-sm text-muted-foreground">
        Point your camera at the UPC barcode, or take a photo.
      </p>
      <div className="flex w-full flex-col gap-2 px-2">
        <Button
          type="button"
          size="lg"
          className="min-h-12 w-full bg-gradient-to-r from-hanger-gold to-hanger-amber font-bold text-primary-foreground"
          onClick={() => void onStartLiveScan?.()}
        >
          <ScanLine className="mr-2 h-5 w-5" aria-hidden />
          Start live camera
        </Button>
        <label
          htmlFor={captureInputId}
          className={cn(
            'inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-lg border border-hanger-amber/50 text-sm font-medium text-hanger-amber touch-manipulation hover:bg-muted/50',
            isPhotoScanning && 'pointer-events-none opacity-70',
          )}
        >
          {isPhotoScanning ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Camera className="mr-2 h-4 w-4" aria-hidden />
          )}
          {isPhotoScanning ? 'Reading photo…' : 'Take photo instead'}
        </label>
        <label
          htmlFor={libraryInputId}
          className="inline-flex min-h-10 w-full cursor-pointer items-center justify-center text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          Choose from photo library
        </label>
      </div>
    </div>
  );
}