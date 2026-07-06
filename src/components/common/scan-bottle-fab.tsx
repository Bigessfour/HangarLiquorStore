import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ScanModal } from '@/features/scan/scan-modal';

export function ScanBottleFab() {
  const location = useLocation();
  const [modalOpen, setModalOpen] = useState(false);
  const isOnScanPage = location.pathname === '/scan';

  if (isOnScanPage) return null;

  return (
    <>
      {modalOpen && <ScanModal onClose={() => setModalOpen(false)} />}
      <div className="pointer-events-none fixed bottom-20 left-0 right-0 z-50 flex justify-center">
      <Button
        type="button"
        aria-label="Scan Bottle"
        onClick={() => setModalOpen(true)}
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
    </>
  );
}
