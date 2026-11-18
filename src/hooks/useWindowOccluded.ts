import { useEffect, useState } from 'react';

/**
 * True when the app window is minimised, hidden, or completely covered by
 * another window.
 *
 * The compositor is the sensor: Chromium stops delivering animation frames to
 * a window nobody can see, so a frame gap longer than `graceMs` reliably means
 * "off screen". Alt-tabbing away while the window is still partially visible
 * keeps frames flowing, so the UI keeps running at full fidelity exactly as
 * the user expects — only genuinely invisible states drop the heavy work.
 */
export function useWindowOccluded(graceMs = 1500): boolean {
  const [occluded, setOccluded] = useState(false);

  useEffect(() => {
    let raf = 0;
    let lastFrame = performance.now();
    let hidden = false;
    let timer = 0;

    const frame = () => {
      lastFrame = performance.now();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const evaluate = () => {
      const isHidden = document.visibilityState === 'hidden' || document.hidden;
      const stale = performance.now() - lastFrame > graceMs;
      const next = isHidden || stale;
      if (next !== hidden) {
        hidden = next;
        setOccluded(next);
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('freq-perf-idle', next);
        }
      }
    };

    // Fast path: minimising hides the document immediately; regaining focus
    // must also re-evaluate at once so animations resume without a visible lag.
    const onVisibility = () => evaluate();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onVisibility);
    window.addEventListener('pageshow', onVisibility);
    timer = window.setInterval(evaluate, 500);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
      window.removeEventListener('pageshow', onVisibility);
      document.documentElement.classList.remove('freq-perf-idle');
    };
  }, [graceMs]);

  return occluded;
}
