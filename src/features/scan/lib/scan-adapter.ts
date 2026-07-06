import { isAndroidNativeApp } from '@/lib/capacitor-platform';
import {
  startLiveBarcodeScanner,
  type LiveScannerHandle,
} from '@/features/scan/lib/barcode-scan';
import {
  startNativeMlKitScan,
  type NativeScanHandle,
} from '@/features/scan/lib/native-barcode-scan';

export type PlatformScanHandle = {
  stop: () => Promise<void>;
};

export { isAndroidNativeApp };

export function usesNativeLiveScan(): boolean {
  return isAndroidNativeApp();
}

export async function startPlatformLiveScan(
  onSuccess: (upc: string) => void,
  onError: (message: string) => void,
  webScannerElementId?: string,
): Promise<PlatformScanHandle> {
  if (isAndroidNativeApp()) {
    return startNativeMlKitScan(onSuccess, onError);
  }
  return startLiveBarcodeScanner(onSuccess, onError, webScannerElementId) as Promise<LiveScannerHandle>;
}