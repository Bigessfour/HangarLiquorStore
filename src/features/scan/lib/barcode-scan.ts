import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  canUseLiveCameraScan,
  getCameraDeniedMessage,
  isIosHomeScreenApp,
} from '@/lib/device-scan';

export const LIVE_SCANNER_ELEMENT_ID = 'hanger-live-barcode-scanner';
export const FILE_SCANNER_ELEMENT_ID = 'hanger-file-barcode-scanner';
export const PHOTO_CAPTURE_INPUT_ID = 'hanger-photo-capture';
export const PHOTO_LIBRARY_INPUT_ID = 'hanger-photo-library';

/** Liquor-store UPC/EAN formats only — faster decode, fewer false positives. */
export const UPC_BARCODE_FORMATS = [
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.CODE_128,
] as const;

const LIVE_CAMERA_CONFIG = {
  fps: 10,
  qrbox: { width: 280, height: 140 },
  aspectRatio: 1.5,
  disableFlip: true,
  videoConstraints: { facingMode: 'environment' as const },
};

function createBarcodeScanner(elementId: string): Html5Qrcode {
  return new Html5Qrcode(elementId, {
    formatsToSupport: [...UPC_BARCODE_FORMATS],
    verbose: false,
  });
}

export function normalizeUpc(raw: string): string | null {
  const upc = raw.replace(/\D/g, '');
  if (upc.length < 8) return null;
  return upc;
}

function formatPhotoScanError(err: unknown): string {
  if (err instanceof Error && err.message) {
    if (/no barcode|not found|decode failed/i.test(err.message)) {
      return 'No UPC found in photo — fill the frame with the barcode and try again.';
    }
    return err.message;
  }
  return 'Could not read barcode from photo. Try again or enter UPC manually.';
}

export async function scanBarcodeFromFile(
  file: File,
  elementId = FILE_SCANNER_ELEMENT_ID,
): Promise<string> {
  const scanner = createBarcodeScanner(elementId);
  try {
    const result = await scanner.scanFileV2(file, false);
    const upc = normalizeUpc(result.decodedText);
    if (!upc) {
      throw new Error('Barcode too short — try a closer photo of the UPC');
    }
    return upc;
  } catch (err) {
    throw new Error(formatPhotoScanError(err));
  }
}

export type LiveScannerHandle = {
  stop: () => Promise<void>;
};

export async function startLiveBarcodeScanner(
  onSuccess: (upc: string) => void,
  onError: (message: string) => void,
  elementId = LIVE_SCANNER_ELEMENT_ID,
): Promise<LiveScannerHandle> {
  if (!canUseLiveCameraScan()) {
    onError(
      isIosHomeScreenApp()
        ? 'Use Take Photo or Choose from Library in the Home Screen app.'
        : 'Live camera is not available on this device.',
    );
    return { stop: async () => {} };
  }

  const scanner = createBarcodeScanner(elementId);
  let stopped = false;

  try {
    await scanner.start(
      { facingMode: 'environment' },
      LIVE_CAMERA_CONFIG,
      (decodedText) => {
        if (stopped) return;
        const upc = normalizeUpc(decodedText);
        if (!upc) return;
        stopped = true;
        void scanner.stop().finally(() => onSuccess(upc));
      },
      () => {
        /* per-frame miss */
      },
    );
  } catch (err) {
    onError(getCameraDeniedMessage(err));
    return { stop: async () => {} };
  }

  return {
    stop: async () => {
      if (stopped) return;
      stopped = true;
      if (scanner.isScanning) {
        try {
          await scanner.stop();
        } catch {
          /* already stopped */
        }
      }
    },
  };
}