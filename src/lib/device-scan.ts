/** iOS / PWA camera helpers for barcode scanning (WebKit limitations). */

export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Live getUserMedia scanning is unreliable in iOS Home Screen / PWA mode (WebKit). */
export function isIosHomeScreenApp(): boolean {
  return isIOSDevice() && isStandalonePwa();
}

export function prefersPhotoCaptureScan(): boolean {
  return isIosHomeScreenApp();
}

export function canUseLiveCameraScan(): boolean {
  return !isIosHomeScreenApp();
}

export function getIosScanHelpUrl(): string {
  if (typeof window === 'undefined') return '';
  const demoNetwork = import.meta.env.VITE_DEMO_NETWORK_URL;
  if (demoNetwork && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return demoNetwork;
  }
  return window.location.origin;
}

export function getCameraDeniedMessage(err: unknown): string {
  if (isIosHomeScreenApp()) {
    return (
      'Live camera is blocked in the iPhone Home Screen app. ' +
      'Use “Take Photo of Barcode” below, or open this same link in Safari for live scanning.'
    );
  }
  if (isIOSDevice()) {
    return (
      'Camera access denied. In Safari: tap Allow when prompted. ' +
      'If you added to Home Screen, open the link in Safari instead, or use photo scan.'
    );
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return 'Camera access denied. Check browser permissions and retry.';
}