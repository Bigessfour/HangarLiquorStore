export type GuidedTrialStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

export interface GuidedTrialState {
  status: GuidedTrialStatus;
  stepIndex: number;
}

export interface GuidedTrialStep {
  id: string;
  /** Route to navigate to before spotlight (omit for welcome overlay-only). */
  route?: string;
  /** data-tour attribute value; omit for centered welcome/finish cards. */
  target?: string;
  title: string;
  body: string;
}
