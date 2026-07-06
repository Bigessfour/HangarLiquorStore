import { Html5Qrcode } from 'html5-qrcode';
import {
  canUseLiveCameraScan,
  getCameraDeniedMessage,
  isIosHomeScreenApp,
} from '@/lib/device-scan';

export const LIVE_SCANNER_ELEMENT_ID = 'hanger-live-barcode-scanner';
export const FILE_SCANNER_ELEMENT_ID = 'hanger-file-barcode-scanner';
export const PHOTO_CAPTURE_INPUT_ID = 'hanger-photo-capture';
export const PHOTO_LIBRARY_INPUT_ID = 'hanger-photo-library';

export function normalizeUpc(raw: string): string | null {
  const upc = raw.replace(/\D/g, '');
  if (upc.length < 8) return null;
  return upc;
}

export async function scanBarcodeFromFile(
  file: File,
  elementId = FILE_SCANNER_ELEMENT_ID,
): Promise<string> {
  const scanner = new Html5Qrcode(elementId);
  const decoded = await scanner.scanFile(file, false);
  const upc = normalizeUpc(decoded);
  if (!upc) throw new Error('Barcode too short — try a closer photo of the UPC');
  return upc;
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

  try {
    await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
  } catch (err) {
    onError(getCameraDeniedMessage(err));
    return { stop: async () => {} };
  }

  const scanner = new Html5Qrcode(elementId);
  let stopped = false;

  await scanner.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: { width: 280, height: 140 }, aspectRatio: 1.5 },
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