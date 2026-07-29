import { useEffect, useLayoutEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { GUIDED_TRIAL_STEPS } from './tour-steps';
import { useGuidedTrialStore } from './guided-trial-store';
import { runTryActionAsync } from './run-try-action';

interface SpotRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function GuidedTrialOverlay() {
  const navigate = useNavigate();
  const location = useLocation();
  const { active, stepIndex, next, back, skip, complete } = useGuidedTrialStore();
  const step = GUIDED_TRIAL_STEPS[stepIndex];
  const [spot, setSpot] = useState<SpotRect | null>(null);
  const [tried, setTried] = useState(false);
  const [tryFeedback, setTryFeedback] = useState<string | null>(null);
  const [tryPending, setTryPending] = useState(false);

  useEffect(() => {
    if (!active || !step?.route) return;
    if (location.pathname !== step.route) {
      navigate(step.route);
    }
  }, [active, step, location.pathname, navigate]);

  useEffect(() => {
    setTried(false);
    setTryFeedback(null);
    setTryPending(false);
  }, [stepIndex, step?.id]);

  useLayoutEffect(() => {
    if (!active || !step) return;

    const measure = () => {
      if (!step.target) {
        setSpot(null);
        return;
      }
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      if (!el) {
        setSpot(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      const pad = 8;
      setSpot({
        top: Math.max(0, rect.top - pad),
        left: Math.max(0, rect.left - pad),
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      });
    };

    measure();
    const t = window.setTimeout(measure, 150);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [active, step, location.pathname]);

  if (!active || !step) return null;

  const isLast = stepIndex >= GUIDED_TRIAL_STEPS.length - 1;
  const progress = `${stepIndex + 1} / ${GUIDED_TRIAL_STEPS.length}`;
  const showTry = Boolean(step.tryHint || step.tryTestId);

  const handleTry = async () => {
    if (tryPending) return;
    // Scan: use ?upc= handoff — same path as FAB; reliable vs controlled-input DOM hacks.
    if (step.id === 'scan') {
      navigate('/scan?upc=071984000012');
      setTried(true);
      setTryFeedback('Nice — that control worked. Tap Next when you are ready.');
      return;
    }
    setTryPending(true);
    try {
      const ok = await runTryActionAsync(step);
      setTried(true);
      setTryFeedback(
        ok
          ? 'Nice — that control worked. Tap Next when you are ready.'
          : 'Could not find that control — tap Next to continue, or Skip.',
      );
    } finally {
      setTryPending(false);
    }
  };

  // After Try it, let page dialogs/controls receive taps; coach card stays on top.
  const pageInteract = tried;
  // After Try, park the coach card at the top so bottom-of-page replies (Ask Hangar) stay visible.
  const coachAtTop = tried && (step.id === 'profit' || step.id === 'suggestions');

  return (
    <div
      className={pageInteract ? 'pointer-events-none fixed inset-0 z-[80]' : 'fixed inset-0 z-[80]'}
      role="dialog"
      aria-modal={!pageInteract}
      aria-labelledby="guided-trial-title"
      data-testid="guided-trial-overlay"
    >
      {spot ? (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-hanger-amber"
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
            boxShadow: pageInteract
              ? '0 0 0 9999px rgba(15, 23, 42, 0.35)'
              : '0 0 0 9999px rgba(15, 23, 42, 0.72)',
          }}
          aria-hidden
        />
      ) : (
        <div
          className={
            pageInteract ? 'absolute inset-0 bg-slate-950/35' : 'absolute inset-0 bg-slate-950/70'
          }
          aria-hidden
        />
      )}

      <div
        className={cn(
          'pointer-events-auto absolute left-1/2 z-[81] w-[min(100%-1.5rem,24rem)] -translate-x-1/2 rounded-2xl border border-hanger-amber/40 bg-card p-4 shadow-lg',
          coachAtTop ? 'top-4' : 'bottom-28 sm:bottom-32',
        )}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wider text-hanger-amber">
          Trial run · {progress}
        </p>
        <h2 id="guided-trial-title" className="mt-1 text-lg font-bold text-foreground">
          {step.title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>

        {showTry && (
          <div className="mt-3 space-y-2 rounded-xl border border-hanger-amber/25 bg-hanger-amber/5 p-3">
            {step.tryHint && <p className="text-sm text-foreground">{step.tryHint}</p>}
            <Button
              type="button"
              variant="secondary"
              className="min-h-12 w-full"
              onClick={() => void handleTry()}
              disabled={tryPending}
              data-testid="guided-trial-try"
            >
              {tryPending ? 'Trying…' : 'Try it'}
            </Button>
            {tryFeedback && (
              <p className="text-xs text-muted-foreground" data-testid="guided-trial-try-feedback">
                {tryFeedback}
              </p>
            )}
            {step.requireTry && !tried && (
              <p className="text-[10px] text-muted-foreground">
                Suggested before Next — Next still works if you want to skip the tap.
              </p>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-12 flex-1"
            onClick={skip}
            data-testid="guided-trial-skip"
          >
            Skip
          </Button>
          {stepIndex > 0 && (
            <Button type="button" variant="outline" className="min-h-12 flex-1" onClick={back}>
              Back
            </Button>
          )}
          <Button
            type="button"
            className="min-h-12 flex-1 bg-hanger-amber text-primary-foreground hover:bg-hanger-amber/90"
            onClick={() => (isLast ? complete() : next())}
            data-testid="guided-trial-next"
          >
            {isLast ? 'Finish' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}
