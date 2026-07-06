import type { PluginListenerHandle } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import {
  BarcodeFormat,
  BarcodeScanner,
  type BarcodesScannedEvent,
} from '@capacitor-mlkit/barcode-scanning';
import { normalizeUpc } from '@/features/scan/lib/barcode-scan';

const UPC_FORMATS = [
  BarcodeFormat.UpcA,
  BarcodeFormat.UpcE,
  BarcodeFormat.Ean13,
  BarcodeFormat.Ean8,
  BarcodeFormat.Code128,
];

export type NativeScanHandle = {
  stop: () => Promise<void>;
};

async function cleanupNativeScan(listener: PluginListenerHandle | null): Promise<void> {
  document.body.classList.remove('barcode-scanner-active');
  if (listener) {
    try {
      await listener.remove();
    } catch {
      /* already removed */
    }
  }
  try {
    await BarcodeScanner.removeAllListeners();
  } catch {
    /* ignore */
  }
  try {
    await BarcodeScanner.stopScan();
  } catch {
    /* ignore */
  }
}

function firstUpcFromEvent(event: BarcodesScannedEvent): string | null {
  for (const barcode of event.barcodes) {
    const upc = normalizeUpc(barcode.rawValue ?? barcode.displayValue ?? '');
    if (upc) return upc;
  }
  return null;
}

export async function startNativeMlKitScan(
  onSuccess: (upc: string) => void,
  onError: (message: string) => void,
): Promise<NativeScanHandle> {
  const { supported } = await BarcodeScanner.isSupported();
  if (!supported) {
    onError('Native barcode scanning is not supported on this device.');
    return { stop: async () => {} };
  }

  const permissions = await BarcodeScanner.checkPermissions();
  if (permissions.camera !== 'granted') {
    const requested = await BarcodeScanner.requestPermissions();
    if (requested.camera !== 'granted') {
      onError('Camera permission is required for live barcode scanning.');
      return { stop: async () => {} };
    }
  }

  document.body.classList.add('barcode-scanner-active');
  let stopped = false;
  let listener: PluginListenerHandle | null = null;

  listener = await BarcodeScanner.addListener(
    'barcodesScanned',
    async (event: BarcodesScannedEvent) => {
      if (stopped) return;
      const upc = firstUpcFromEvent(event);
      if (!upc) return;

      stopped = true;
      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch {
        /* haptics optional */
      }
      await cleanupNativeScan(listener);
      onSuccess(upc);
    },
  );

  try {
    await BarcodeScanner.startScan({ formats: UPC_FORMATS });
  } catch (err) {
    stopped = true;
    await cleanupNativeScan(listener);
    onError(err instanceof Error ? err.message : 'Could not start native scanner');
    return { stop: async () => {} };
  }

  return {
    stop: async () => {
      if (stopped) return;
      stopped = true;
      await cleanupNativeScan(listener);
    },
  };
}