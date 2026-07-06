import { Copy, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isDemoAuthEnabled } from '@/lib/demo-auth';
import { toast } from 'sonner';

const PHONE_URL = import.meta.env.VITE_DEMO_NETWORK_URL || '';

export function DemoPhoneBanner() {
  if (!isDemoAuthEnabled() || !PHONE_URL) return null;

  const onLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  if (!onLocalhost) return null;

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(PHONE_URL);
      toast.success('Copied — paste in your phone browser');
    } catch {
      toast.message(PHONE_URL);
    }
  };

  return (
    <div className="sticky top-14 z-20 border-b border-hanger-amber/40 bg-hanger-amber/10 px-4 py-3">
      <div className="mx-auto flex max-w-lg items-start gap-3">
        <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-hanger-amber" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-hanger-amber">Open on your phone (same Wi‑Fi)</p>
          <p className="mt-1 break-all font-mono text-base font-bold text-foreground">{PHONE_URL}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Type this in Safari or Chrome on your phone — not localhost.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0 border-hanger-amber/50"
          onClick={() => void copyUrl()}
          aria-label="Copy phone URL"
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}