import { create } from 'zustand';
import { GUIDED_TRIAL_STEPS } from './tour-steps';
import {
  loadGuidedTrialState,
  saveGuidedTrialState,
  shouldAutoOfferTrial,
} from './tour-storage';

interface GuidedTrialStore {
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  stepIndex: number;
  active: boolean;
  hydrated: boolean;
  hydrate: () => void;
  start: () => void;
  resume: () => void;
  next: () => void;
  back: () => void;
  skip: () => void;
  complete: () => void;
}

export const useGuidedTrialStore = create<GuidedTrialStore>((set, get) => ({
  status: 'not_started',
  stepIndex: 0,
  active: false,
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    const saved = loadGuidedTrialState();
    set({
      status: saved.status,
      stepIndex: saved.stepIndex,
      active: shouldAutoOfferTrial(saved.status),
      hydrated: true,
    });
  },

  start: () => {
    const next = { status: 'in_progress' as const, stepIndex: 0 };
    saveGuidedTrialState(next);
    set({ ...next, active: true });
  },

  resume: () => {
    const { stepIndex, status } = get();
    const idx = status === 'in_progress' ? stepIndex : 0;
    const next = { status: 'in_progress' as const, stepIndex: idx };
    saveGuidedTrialState(next);
    set({ ...next, active: true });
  },

  next: () => {
    const { stepIndex } = get();
    if (stepIndex >= GUIDED_TRIAL_STEPS.length - 1) {
      get().complete();
      return;
    }
    const next = { status: 'in_progress' as const, stepIndex: stepIndex + 1 };
    saveGuidedTrialState(next);
    set(next);
  },

  back: () => {
    const { stepIndex } = get();
    if (stepIndex <= 0) return;
    const next = { status: 'in_progress' as const, stepIndex: stepIndex - 1 };
    saveGuidedTrialState(next);
    set(next);
  },

  skip: () => {
    const next = { status: 'skipped' as const, stepIndex: get().stepIndex };
    saveGuidedTrialState(next);
    set({ ...next, active: false });
  },

  complete: () => {
    const next = {
      status: 'completed' as const,
      stepIndex: GUIDED_TRIAL_STEPS.length - 1,
    };
    saveGuidedTrialState(next);
    set({ ...next, active: false });
  },
}));
