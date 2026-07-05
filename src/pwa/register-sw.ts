import { registerSW } from 'virtual:pwa-register';

export function registerServiceWorker(): void {
  registerSW({
    immediate: true,
    onRegisteredSW(swUrl, registration) {
      console.info('Hanger PWA service worker registered:', swUrl, registration);
    },
    onRegisterError(error) {
      console.warn('PWA registration failed:', error);
    },
  });
}