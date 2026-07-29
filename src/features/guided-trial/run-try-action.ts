import type { GuidedTrialStep } from './tour-types';

const DEMO_SCAN_UPC = '071984000012';

function setNativeInputValue(el: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  const previous = el.value;
  setter?.call(el, value);
  const tracker = (el as unknown as { _valueTracker?: { setValue: (v: string) => void } })
    ._valueTracker;
  tracker?.setValue(previous);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function queryTryTarget(testId: string): HTMLElement | null {
  return document.querySelector(`[data-testid="${testId}"]`) as HTMLElement | null;
}

/** Wait briefly for lazy-mounted controls (e.g. Ask Hangar after profit fetch). */
export async function waitForTryTarget(
  testId: string,
  timeoutMs = 4000,
): Promise<HTMLElement | null> {
  const start = Date.now();
  let el = queryTryTarget(testId);
  while (!el && Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 100));
    el = queryTryTarget(testId);
  }
  return el;
}

/**
 * Drive a real working control for the current tour stop.
 * Returns true when a control was found and activated.
 */
export function runTryAction(step: GuidedTrialStep): boolean {
  if (step.id === 'scan') {
    const input = document.querySelector(
      '[data-testid="scan-manual-upc"]',
    ) as HTMLInputElement | null;
    const apply = document.querySelector(
      '[data-testid="scan-apply-manual-upc"]',
    ) as HTMLButtonElement | null;
    if (!input || !apply) return false;
    setNativeInputValue(input, DEMO_SCAN_UPC);
    apply.click();
    return true;
  }

  if (!step.tryTestId) return false;
  const el = queryTryTarget(step.tryTestId);
  if (!el) return false;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el.click();
  return true;
}

/** Async Try for stops whose targets mount after data load. */
export async function runTryActionAsync(step: GuidedTrialStep): Promise<boolean> {
  if (step.id === 'scan') {
    return runTryAction(step);
  }
  if (!step.tryTestId) return false;
  const el = await waitForTryTarget(step.tryTestId);
  if (!el) return false;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el.click();
  return true;
}
