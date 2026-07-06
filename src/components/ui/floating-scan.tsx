import { ScanLine } from 'lucide-react';

// Big FAB per provided spec (Phase 2). 
// NOTE: The primary FAB lives in components/common/scan-bottle-fab.tsx (thumb-friendly centered + pulse).
// This is exported for optional use in headers/modals.
export function FloatingScanButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Open scan camera"
      className="fixed bottom-24 right-6 bg-amber-500 text-zinc-900 rounded-full w-16 h-16 flex items-center justify-center shadow-2xl shadow-amber-500/50 active:scale-95 text-3xl z-50 touch-manipulation"
    >
      📸
    </button>
  );
}
