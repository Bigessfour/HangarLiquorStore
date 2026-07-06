export type InstallPlatform =
  | 'android-chrome'
  | 'android-other'
  | 'android-installed'
  | 'ios-safari'
  | 'ios-installed'
  | 'ipad-safari'
  | 'desktop';

export function isStandaloneInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isIPad(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

export function isMobileDevice(): boolean {
  return isIOS() || isIPad() || isAndroid();
}

export function getInstallPlatform(): InstallPlatform {
  if (isStandaloneInstalled()) {
    if (isAndroid()) return 'android-installed';
    return isIPad() ? 'ios-installed' : 'ios-installed';
  }
  if (isIPad()) return 'ipad-safari';
  if (isIOS()) return 'ios-safari';
  if (isAndroid()) {
    return /Chrome/i.test(navigator.userAgent) ? 'android-chrome' : 'android-other';
  }
  return 'desktop';
}

export function getPwabuilderReportUrl(appUrl?: string): string {
  const url = appUrl || getPublicAppUrl();
  if (!url || url.startsWith('http://')) return 'https://www.pwabuilder.com/';
  return `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(url)}`;
}

/** Public app URL for QR codes and PWABuilder (HTTPS in production). */
export function getPublicAppUrl(): string {
  if (typeof window === 'undefined') return '';
  const demoNetwork = import.meta.env.VITE_DEMO_NETWORK_URL;
  const configured = import.meta.env.VITE_PWA_URL;
  if (configured) return configured.replace(/\/$/, '');
  const isLocal =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isLocal && demoNetwork) return demoNetwork.replace(/\/$/, '');
  return window.location.origin;
}

export function getAndroidApkUrl(): string | null {
  const url = import.meta.env.VITE_ANDROID_APK_URL;
  return url || null;
}