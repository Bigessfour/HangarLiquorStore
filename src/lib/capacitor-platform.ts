import { Capacitor } from '@capacitor/core';

/** True when running inside the Capacitor Android shell (not browser/PWA). */
export function isAndroidNativeApp(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export function isNativeMobileApp(): boolean {
  return Capacitor.isNativePlatform();
}