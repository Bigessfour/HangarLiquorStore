import { ScanLine, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type NativeScanOverlayProps = {
  onCancel: () => void;
};

/**
 * Visible UI while ML Kit camera runs behind the WebView (body.barcode-scanner-active).
 * Walmart-style viewfinder — native camera is not inside the DOM.
 */
export function NativeScanOverlay({ onCancel }: NativeScanOverlayProps) {
  return (
    <div
      className="native-scan-overlay barcode-scanner-modal fixed inset-0 z-[70] flex flex-col bg-transparent"
      role="dialog"
      aria-modal="true"
      aria-label="Live barcode scanner"
    >
      <div className="flex items-center justify-between px-4 pb-2 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <p className="text-lg font-semibold text-white drop-shadow-md">Scan UPC</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-12 w-12 text-white hover:bg-white/10"
          aria-label="Cancel scanner"
          onClick={onCancel}
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="relative flex h-[min(48vh,320px)] w-full max-w-sm items-center justify-center rounded-2xl border-2 border-hanger-amber shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
          <div className="absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-hanger-amber/60" aria-hidden />
          <ScanLine className="h-12 w-12 text-hanger-amber drop-shadow-lg" aria-hidden />
        </div>
        <p className="mt-6 max-w-xs text-center text-sm font-medium text-white drop-shadow-md">
          Point at the UPC barcode — scanning automatically
        </p>
        <p className="mt-2 text-center text-xs text-white/80">Live native scanner (Android)</p>
      </div>

      <div className="p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <Button
          type="button"
          variant="outline"
          className="min-h-12 w-full border-white/40 bg-black/40 text-white"
          onClick={onCancel}
        >
          Cancel scan
        </Button>
      </div>
    </div>
  );
}