import { useEffect, useLayoutEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GUIDED_TRIAL_STEPS } from './tour-steps';
import { useGuidedTrialStore } from './guided-trial-store';

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

  useEffect(() => {
    if (!active || !step?.route) return;
    if (location.pathname !== step.route) {
      navigate(step.route);
    }
  }, [active, step, location.pathname, navigate]);

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

  return (
    <div
      className="fixed inset-0 z-[80]"
      role="dialog"
      aria-modal="true"
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
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.72)',
          }}
          aria-hidden
        />
      ) : (
        <div className="absolute inset-0 bg-slate-950/70" aria-hidden />
      )}

      <div className="pointer-events-auto absolute bottom-28 left-1/2 z-[81] w-[min(100%-1.5rem,24rem)] -translate-x-1/2 rounded-2xl border border-hanger-amber/40 bg-card p-4 shadow-lg sm:bottom-32">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-hanger-amber">
          Trial run · {progress}
        </p>
        <h2 id="guided-trial-title" className="mt-1 text-lg font-bold text-foreground">
          {step.title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>

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
