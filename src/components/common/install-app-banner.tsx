import { useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePwaInstall } from '@/hooks/use-pwa-install';
import {
  getInstallPlatform,
  getPublicAppUrl,
  isMobileDevice,
  isStandaloneInstalled,
} from '@/lib/pwa-platform';

const DISMISS_KEY = 'hanger-install-banner-dismissed';

export function InstallAppBanner() {
  const { isInstallable, isInstalled, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  if (dismissed || isInstalled || isStandaloneInstalled()) return null;

  const platform = getInstallPlatform();
  const showOnMobile = isMobileDevice();
  const showChromePrompt = platform === 'android-chrome' && isInstallable;

  if (!showOnMobile && !showChromePrompt) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const iosSteps = (
    <p className="text-xs text-muted-foreground">
      Tap <Share className="inline h-3.5 w-3.5" aria-hidden /> Share, then{' '}
      <strong>Add to Home Screen</strong> for a full-screen app icon.
    </p>
  );

  return (
    <div className="sticky top-14 z-20 border-b border-hanger-gold/30 bg-gradient-to-r from-hanger-gold/10 to-hanger-amber/5 px-4 py-2.5">
      <div className="mx-auto flex max-w-lg items-start gap-2">
        <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-hanger-gold" aria-hidden />
        <div className="min-w-0 flex-1">
          {showChromePrompt ? (
            <>
              <p className="text-sm font-medium text-hanger-gold">Install Hanger Liquor Store</p>
              <p className="text-xs text-muted-foreground">Works offline — no Play Store needed.</p>
              <Button
                type="button"
                size="sm"
                className="mt-2 min-h-10 bg-hanger-amber text-primary-foreground hover:bg-hanger-amber/90"
                onClick={() => void promptInstall()}
              >
                <Download className="mr-1.5 h-4 w-4" aria-hidden />
                Install app
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-hanger-gold">Add to Home Screen</p>
              {iosSteps}
              <p className="mt-1 text-[10px] text-muted-foreground">
                Open in Safari if you do not see Share: {getPublicAppUrl()}
              </p>
            </>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={dismiss}
          aria-label="Dismiss install banner"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}