import { useEffect } from 'react';
import { GuidedTrialOverlay } from './guided-trial-overlay';
import { useGuidedTrialStore } from './guided-trial-store';

/** Hydrates trial progress and mounts the overlay when active. */
export function GuidedTrialHost() {
  const hydrate = useGuidedTrialStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return <GuidedTrialOverlay />;
}
