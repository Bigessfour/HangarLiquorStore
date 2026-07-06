/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_COGNITO_USER_POOL_ID: string;
  readonly VITE_COGNITO_CLIENT_ID: string;
  /** Set to "true" for local demo / e2e without Cognito */
  readonly VITE_DEMO_AUTH: string;
  /** LAN URL for phone demo, e.g. http://192.168.1.5:5173 */
  readonly VITE_DEMO_NETWORK_URL: string;
  /** Public HTTPS URL for PWA install / PWABuilder (production CloudFront) */
  readonly VITE_PWA_URL: string;
  /** Optional sideload APK hosted on S3/CloudFront after npm run package:android */
  readonly VITE_ANDROID_APK_URL: string;
  /** Capacitor native APK with ML Kit live scanning (npm run build:android + upload:android-apk) */
  readonly VITE_NATIVE_ANDROID_APK_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
