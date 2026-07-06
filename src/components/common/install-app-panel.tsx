import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Printer,
  Share,
  Smartphone,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePwaInstall } from '@/hooks/use-pwa-install';
import {
  getAndroidApkUrl,
  getInstallPlatform,
  getPublicAppUrl,
  getPwabuilderReportUrl,
  type InstallPlatform,
} from '@/lib/pwa-platform';
import { toast } from 'sonner';

function IosInstallSteps({ deviceLabel }: { deviceLabel: string }) {
  return (
    <ol className="list-decimal space-y-2 pl-4 text-sm text-muted-foreground">
      <li>
        Open this page in <strong>Safari</strong> on your {deviceLabel} (not an in-app browser).
      </li>
      <li>
        Tap the <Share className="inline h-4 w-4 text-foreground" aria-hidden /> Share button at the
        bottom of Safari.
      </li>
      <li>
        Scroll and tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.
      </li>
      <li>Open the <strong>Hanger</strong> icon — full-screen app, works offline.</li>
      <li>
        On Scan, use <strong>Take Photo of Barcode</strong> (live camera is limited in iOS home
        screen apps).
      </li>
    </ol>
  );
}

function AndroidInstallSteps({
  onInstall,
  canPrompt,
  apkUrl,
}: {
  onInstall: () => void;
  canPrompt: boolean;
  apkUrl: string | null;
}) {
  return (
    <div className="space-y-3">
      {canPrompt && (
        <Button
          type="button"
          className="min-h-12 w-full bg-hanger-amber text-primary-foreground hover:bg-hanger-amber/90"
          onClick={onInstall}
        >
          <Download className="mr-2 h-5 w-5" aria-hidden />
          Install app (Chrome)
        </Button>
      )}
      <ol className="list-decimal space-y-2 pl-4 text-sm text-muted-foreground">
        <li>Open this site in <strong>Chrome</strong> on your Android phone or tablet.</li>
        {canPrompt ? (
          <li>Tap <strong>Install app</strong> above, or use the browser menu → Install app.</li>
        ) : (
          <li>
            Tap the menu (⋮) → <strong>Install app</strong> or <strong>Add to Home screen</strong>.
          </li>
        )}
        <li>The Hanger icon appears on your home screen — no Play Store required.</li>
      </ol>
      {apkUrl && (
        <div className="rounded-lg border border-hanger-amber/30 bg-muted/40 p-3">
          <p className="text-sm font-medium">Sideload APK (no Play Store)</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Download the Android package built with PWABuilder, then open the .apk and allow install
            from your files app.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 min-h-10 w-full"
            asChild
          >
            <a href={apkUrl} download>
              <Download className="mr-2 h-4 w-4" aria-hidden />
              Download Android APK
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}

function PlatformInstructions({
  platform,
  onInstall,
  canPrompt,
  apkUrl,
}: {
  platform: InstallPlatform;
  onInstall: () => void;
  canPrompt: boolean;
  apkUrl: string | null;
}) {
  switch (platform) {
    case 'ios-installed':
    case 'android-installed':
      return (
        <div className="flex items-start gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-green-600" aria-hidden />
          <div>
            <p className="font-medium text-green-700 dark:text-green-400">App installed</p>
            <p className="text-sm text-muted-foreground">
              You are running Hanger as a home screen app. Inventory and scans work offline when
              cached.
            </p>
          </div>
        </div>
      );
    case 'ios-safari':
      return <IosInstallSteps deviceLabel="iPhone" />;
    case 'ipad-safari':
      return <IosInstallSteps deviceLabel="iPad" />;
    case 'android-chrome':
    case 'android-other':
      return (
        <AndroidInstallSteps onInstall={onInstall} canPrompt={canPrompt} apkUrl={apkUrl} />
      );
    default:
      return (
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            On a phone or tablet, open the URL below in Safari (iPhone/iPad) or Chrome (Android),
            then add to home screen for a full app experience.
          </p>
          <p>
            PWABuilder validates the manifest and can build an Android APK for sideloading — no App
            Store or Play Store required.
          </p>
        </div>
      );
  }
}

export function InstallAppPanel({ showQr = true }: { showQr?: boolean }) {
  const { isInstallable, isInstalled, promptInstall } = usePwaInstall();
  const [appUrl, setAppUrl] = useState('');
  const [qrLoaded, setQrLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const platform = getInstallPlatform();
  const apkUrl = getAndroidApkUrl();
  const pwabuilderUrl = getPwabuilderReportUrl(appUrl);

  useEffect(() => {
    setAppUrl(getPublicAppUrl());
  }, []);

  const qrCodeUrl = appUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(appUrl)}`
    : '';

  useEffect(() => {
    if (!qrCodeUrl || !canvasRef.current || !showQr) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = 200;
      canvas.height = 200;
      ctx.drawImage(img, 0, 0, 200, 200);
      setQrLoaded(true);
    };
    img.src = qrCodeUrl;
  }, [qrCodeUrl, showQr]);

  const copyUrl = async () => {
    if (!appUrl) return;
    try {
      await navigator.clipboard.writeText(appUrl);
      toast.success('App URL copied');
    } catch {
      toast.message(appUrl);
    }
  };

  const printQr = () => {
    const canvas = canvasRef.current;
    if (!canvas || !qrLoaded) return;

    const printWindow = window.open('', '', 'height=480,width=400');
    if (!printWindow) return;

    printWindow.document.write('<html><head><title>Install Hanger</title></head><body>');
    printWindow.document.write('<h2>Hanger Liquor Store — Install App</h2>');
    printWindow.document.write('<p>Scan with your phone camera, then add to home screen.</p>');
    printWindow.document.write(`<img src="${canvas.toDataURL()}" style="width:220px;height:220px;" />`);
    printWindow.document.write(`<p style="font-size:12px;word-break:break-all;">${appUrl}</p>`);
    printWindow.document.write(
      '<p style="font-size:11px;">iPhone/iPad: Safari → Share → Add to Home Screen<br/>Android: Chrome → Install app</p>',
    );
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const downloadQr = () => {
    const canvas = canvasRef.current;
    if (!canvas || !qrLoaded) return;
    const link = document.createElement('a');
    link.download = 'hanger-liquor-install-qr.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleInstall = () => {
    void promptInstall().then((accepted) => {
      if (accepted) toast.success('App installed');
    });
  };

  const isLocalHttp = appUrl.startsWith('http://');

  return (
    <Card className="border-hanger-gold/20">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center gap-3">
          <Smartphone className="h-6 w-6 text-hanger-amber" aria-hidden />
          <div>
            <p className="font-medium">Install the app</p>
            <p className="text-sm text-muted-foreground">
              Full home screen app on iPhone, iPad, and Android — no App Store or Play Store.
            </p>
          </div>
        </div>

        <PlatformInstructions
          platform={platform}
          onInstall={handleInstall}
          canPrompt={isInstallable && !isInstalled}
          apkUrl={apkUrl}
        />

        {isLocalHttp && (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
            Demo LAN URL works for testing. For PWABuilder and permanent installs, deploy to HTTPS
            (CloudFront) and set <code className="text-[10px]">VITE_PWA_URL</code> in your build.
          </p>
        )}

        {appUrl && (
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-sm font-medium">App URL</p>
            <div className="flex gap-2">
              <p className="min-w-0 flex-1 break-all rounded-md border bg-muted/30 px-2 py-1.5 font-mono text-xs">
                {appUrl}
              </p>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={() => void copyUrl()}
                aria-label="Copy app URL"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {showQr && qrCodeUrl && (
          <div className="flex flex-col items-center border-t border-border pt-3">
            <p className="mb-2 text-sm font-medium">Staff QR — scan to open &amp; install</p>
            <canvas ref={canvasRef} className="rounded-lg border border-border" width={200} height={200} />
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="min-h-10"
                onClick={printQr}
                disabled={!qrLoaded}
              >
                <Printer className="mr-1.5 h-4 w-4" aria-hidden />
                Print QR
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="min-h-10"
                onClick={downloadQr}
                disabled={!qrLoaded}
              >
                <Download className="mr-1.5 h-4 w-4" aria-hidden />
                Download QR
              </Button>
            </div>
          </div>
        )}

        <div className="border-t border-border pt-3">
          <p className="text-xs font-medium text-muted-foreground">PWABuilder (Android APK)</p>
          <p className="mt-1 text-xs text-muted-foreground">
            After HTTPS deploy, run{' '}
            <code className="rounded bg-muted px-1 text-[10px]">npm run package:android -- YOUR-URL</code>{' '}
            to generate a sideload APK, or open the report card:
          </p>
          <Button type="button" variant="outline" size="sm" className="mt-2 min-h-10 w-full" asChild>
            <a href={pwabuilderUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
              Open PWABuilder report card
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}