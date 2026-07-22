import type { GuidedTrialState, GuidedTrialStatus } from './tour-types';

const STORAGE_KEY = 'hanger_guided_trial';

const DEFAULT_STATE: GuidedTrialState = {
  status: 'not_started',
  stepIndex: 0,
};

export function loadGuidedTrialState(): GuidedTrialState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<GuidedTrialState>;
    const status = parsed.status;
    if (
      status !== 'not_started' &&
      status !== 'in_progress' &&
      status !== 'completed' &&
      status !== 'skipped'
    ) {
      return { ...DEFAULT_STATE };
    }
    return {
      status,
      stepIndex: typeof parsed.stepIndex === 'number' ? Math.max(0, parsed.stepIndex) : 0,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveGuidedTrialState(state: GuidedTrialState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetGuidedTrialState(): GuidedTrialState {
  const next = { ...DEFAULT_STATE };
  saveGuidedTrialState(next);
  return next;
}

export function shouldAutoOfferTrial(status: GuidedTrialStatus): boolean {
  return status === 'not_started' || status === 'in_progress';
}
