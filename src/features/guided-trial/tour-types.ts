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
  /** Short coaching line shown above the Try it button. */
  tryHint?: string;
  /** data-testid of a real control to click/focus via Try it. */
  tryTestId?: string;
  /**
   * When true, UI nudges Chris to Try before Next — Next is still allowed
   * so demos never trap.
   */
  requireTry?: boolean;
}
