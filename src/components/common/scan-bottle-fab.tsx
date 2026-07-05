import { useState } from 'react';
import { ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export function ScanBottleFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="pointer-events-none fixed bottom-20 left-0 right-0 z-50 flex justify-center">
        <Button
          type="button"
          aria-label="Scan Bottle"
          onClick={() => setOpen(true)}
          className={cn(
            'pointer-events-auto h-20 min-h-20 w-20 min-w-20 rounded-full p-0 shadow-xl',
            'bg-gradient-to-br from-hanger-gold to-hanger-amber text-primary-foreground',
            'animate-fab-pulse hover:scale-105 active:scale-95',
          )}
        >
          <div className="flex flex-col items-center gap-0.5">
            <ScanLine className="h-8 w-8" strokeWidth={2.5} />
            <span className="text-[10px] font-bold leading-none">Scan</span>
          </div>
        </Button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="pb-8">
          <SheetHeader>
            <SheetTitle>Scan Bottle</SheetTitle>
          </SheetHeader>
          <div className="mt-6 flex flex-col items-center gap-4 py-8">
            <div className="flex h-48 w-full items-center justify-center rounded-xl border-2 border-dashed border-hanger-amber/50 bg-muted">
              <ScanLine className="h-16 w-16 text-muted-foreground" />
            </div>
            <p className="text-center text-muted-foreground">
              Point camera at UPC barcode on beer, spirits, or whiskey bottles.
            </p>
            <p className="text-center text-sm text-muted-foreground">
              html5-qrcode camera integration coming next.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}